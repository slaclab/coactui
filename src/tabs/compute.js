import React, { Component, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from "react-bootstrap/Table";
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Fade from 'react-bootstrap/Fade';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import dayjs from "dayjs";
import dayOfYear from 'dayjs/plugin/dayOfYear';
import Plot from "react-plotly.js";
import { ChargeFactor, TwoPrecFloat } from "./widgets";
import _ from "lodash";

dayjs.extend(dayOfYear);

const REPODETAILS = gql`
query Repos($reposinput: RepoInput, $allocationid: MongoId!){
  repos(filter:$reposinput) {
    name
    facility
    users
    facilityObj {
      name
    }
    computeAllocation(allocationid: $allocationid) {
      clustername
      start
      end
      qoses {
        name
        slachours
      }
      userAllocations {
        username
        percent
      }
      usage {
        slachours
        avgcf
      }
      perDateUsage {
        date
        slachours
        machinesecs
        rawsecs
        avgcf
      }
      perUserUsage {
        username
        slachours
        machinesecs
        rawsecs
        avgcf
      }
    }
  }
}
`;

const ALLOCATION_MUTATION = gql`
mutation UpdateUserAllocation($reposinput: RepoInput!, $data: [UserAllocationInput!]!){
  updateUserAllocation(repo: $reposinput, data: $data){
    name
  }
}
`;

const REPO_COMPUTE_ALLOCATION_REQUEST = gql`
mutation repoComputeAllocationRequest($request: SDFRequestInput!){
  repoComputeAllocationRequest(request: $request){
    Id
  }
}
`;



class User extends React.Component {
  constructor(props) {
    super(props);
    this.computeRemaining = (allocation_percent) => {
      let allocated_compute = _.toNumber(allocation_percent)*this.props.repoallocation/100;
      let remaining_compute = allocated_compute - _.get(this.props.user, "slachours", 0);
      let remaining_percent = (remaining_compute/allocated_compute)*100.0;
      return {
        "allocation": _.toNumber(allocation_percent),
        "allocated_compute": allocated_compute,
        "remaining_compute": remaining_compute,
        "remaining_percent": remaining_percent,
        "updt_sts_cls": ""
      }
    }
    this.onUserAllocChangeSuccess = () => {
      console.log("Successfully changed");
      this.setState({"updt_sts_cls": "inplacesuccess"})
    }
    this.onUserAllocChangeError = (error) => {
      console.log("Failed to change user allocation " + error);
      this.setState({"updt_sts_cls": "inplaceerror"})
    }
    this.handleChange = (event) => {
      this.setState({"updt_sts_cls": ""})
      let current_percent = _.get(this.props.user, "allocation.percent", 0);
      if(current_percent == _.toNumber(event.target.value)) {
        console.log("Value has not changed. Skipping updating the DB " + current_percent + " and " + _.toNumber(event.target.value));
        return;
      }
      this.props.onAllocationChange(this.props.user.username, event.target.value, this.onUserAllocChangeSuccess, this.onUserAllocChangeError);
      this.setState(this.computeRemaining(event.target.value));
    }
    this.state = this.computeRemaining(_.get(this.props.user, "allocation.percent", 0));
  }

  render() {
    return (
      <Row data-userid={this.props.user.username}>
        <Col>{this.props.user.username}</Col>
        <Col className={this.state.updt_sts_cls}><input className="usrcmpalc" type="number" defaultValue={this.state.allocation} onBlur={this.handleChange}/>
             <span className="invalid-feedback"></span></Col>
        <Col><TwoPrecFloat value={this.state.allocated_compute}/></Col>
        <Col><TwoPrecFloat value={this.props.user.slachours}/></Col>
        <Col><TwoPrecFloat value={this.state.remaining_percent}/></Col>
      </Row>
    )}
}

class TopTab extends React.Component {
  constructor(props) {
    super(props);
    this.current_allocation = _.sum(_.map(_.get(this.props.repodata.computeAllocation, "qoses", []), "slachours"));
    this.slachours_charged = _.sum(_.map(_.get(this.props.repodata.computeAllocation, "usage", []), "slachours"));
    this.available_slachours = this.current_allocation - this.slachours_charged;
    this.remaining_percent = (this.available_slachours/this.current_allocation)*100.0;
  }
  render() {
    return (<Table striped bordered>
      <tbody>
        <tr>
          <th><label>Current allocation</label></th>
          <td>{this.current_allocation}</td>
          <th><label>Hours charged</label></th>
          <td><TwoPrecFloat value={this.slachours_charged}/></td>
          <th><label>Available hours</label></th>
          <td><TwoPrecFloat value={this.available_slachours}/></td>
          <th><label>Remaining %</label></th>
          <td><TwoPrecFloat value={this.remaining_percent}/></td>
        </tr>
      </tbody>
      </Table>
    );
  }
}

class MidChart extends React.Component {
  constructor(props) {
    super(props);
    this.current_allocation = _.sum(_.map(_.get(this.props.repodata.computeAllocation, "qoses", []), "slachours"));
    let per_date_usage = _.get(props.repodata.computeAllocation, "perDateUsage", []);
    console.log(per_date_usage);

    this.layout = { showlegend: true, legend: { x: 0.075, xanchor: 'center', y: 0.98, font: { family: 'Optima, Helevetica, Lucida Grande, Lucida Sans, sans-serif', size: 14, color: '#000' } }, autosize: false, width: window.innerWidth, height: 0.4*window.innerHeight, margin: { t: 0, b: -0.1 } };
    let uniform_charge_rate = { x: [], y: [], type: 'scatter', name: "Uniform Charge Rate" }, daily_charge_rate = { x: [], y: [], type: 'scatter', "name": "Hours charged" };
    let daily_usage_by_day = _.keyBy(per_date_usage, (x) => dayjs(x["date"]).dayOfYear()), avg_allocation = this.current_allocation/(dayjs().endOf("year").diff(dayjs().startOf('year'), "days")), cuml_daily_usage = 0, today = dayjs();
    for(let i=0, d = dayjs().startOf('year'); d.isBefore(dayjs().endOf("year")); d = d.add(1, "days"), i=i+1) {
      uniform_charge_rate.x.push(d.toDate()); uniform_charge_rate.y.push(i*avg_allocation);
      if(d.isBefore(today)){ daily_charge_rate.x.push(d.toDate()); cuml_daily_usage = cuml_daily_usage + (_.get(daily_usage_by_day, d.dayOfYear() + ".slachours", 0)); daily_charge_rate.y.push(cuml_daily_usage); }
    }
    this.chartdata = [uniform_charge_rate, daily_charge_rate];
  }

  render() {
    return (
      <div className="midchart">
        <Plot data={this.chartdata} layout={this.layout} style={{width: "100%", height: "100%"}} />
      </div>
    )
  }
}


class BottomTab extends React.Component {
  constructor(props) {
    super(props);
    this.current_allocation = _.sum(_.map(_.get(this.props.repodata.computeAllocation, "qoses", []), "slachours"));

    const repodata = props.repodata,
      per_user_allocations = _.get(this.props.repodata.computeAllocation, "userAllocations", []),
      per_user_usage = _.get(this.props.repodata.computeAllocation, "perUserUsage", []),
      repo_users = _.get(repodata, "users", []);


    console.log(per_user_allocations);
    // Users can come and go.. Collect all the users from the both the repo itself and also from any past jobs
    var users = _.fromPairs(_.map(_.union(_.map(per_user_allocations, "username"), _.map(per_user_usage, "username"), repo_users), u => [ u, { username: u, allocated_compute: 0, remaining_compute: 0, remaining_percent: 100}]));
    _.each(per_user_allocations, function(v,k){ users[v["username"]]["allocation"] = _.cloneDeep(v) });
    _.each(per_user_usage, function(pu){ users[pu["username"]]["slachours"] = pu["slachours"] });
    console.log(users);

    this.users = users;
  }

  render() {
    return (
      <div className="btmtbl">
        <Row className="hdr">
          <Col>Username</Col>
          <Col>Allocation (% of repo)</Col>
          <Col>Allocated hours</Col>
          <Col>Used hours</Col>
          <Col>Remaining hours</Col>
        </Row>
        {_.map(_.sortBy(this.users, "username"), (user, k) => ( <User key={user.username}  user={user} repoallocation={this.current_allocation} onAllocationChange={this.props.onAllocationChange}/> ))}
      </div>
    );
    }
}

class ChangeAllocationModal extends Component {
  constructor(props) {
    super(props);
    this.qosnames = _.map(_.get(props.currallocation, "qoses"), "name");
    this.state = { qosname: "", qosInvalid: false, allocationRequest: 0, allocationRequestInvalid: false, notes: "" }
    this.handleClose = () => { this.props.setShow(false); }
    this.setQosName = (event) => {
      let qosname = event.target.value;
      let currAlloc = _.get(_.find(_.get(props.currallocation, "qoses"), ["name", qosname]), "slachours", 0)
      this.setState({ qosname: qosname, allocationRequest: currAlloc })
    }
    this.setAllocationRequest = (event) => { this.setState({ allocationRequest: event.target.value }) }
    this.setnotes = (event) => { this.setState({ notes: event.target.value }) }
    this.changeAllocationRequest = () => {
      console.log(this.state.allocationRequest);
      if(_.isEmpty(this.state.allocationRequest)) {
        this.setState({ allocationRequestInvalid: true });
        return;
      }
      this.props.requestChangeAllocation(this.state.qosname, this.state.allocationRequest, this.state.notes);
      this.props.setShow(false);
    }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Change compute allocation for {this.props.reponame} on cluster {this.props.clustername}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Form.Text>Which QOS should we change?</Form.Text>
            <InputGroup hasValidation>
              <Form.Select name="shell" value={this.state.qosname} onChange={this.setQosName} isInvalid={this.state.qosInvalid}>
                <option value="">Please choose a QOS</option>
                { _.map(this.qosnames, (q) => { return (<option key={q} value={q}>{q}</option>)}) }
              </Form.Select>
              <Form.Control.Feedback type="invalid">Please choose a valid QOS.</Form.Control.Feedback>
            </InputGroup>
            <Form.Text>Please enter the compute (in hours) needed</Form.Text>
            <InputGroup hasValidation>
              <Form.Control type="number" value={this.state.allocationRequest} value={this.state.allocationRequest} onChange={this.setAllocationRequest} isInvalid={this.state.allocationRequestInvalid}/>
              <Form.Control.Feedback type="invalid">Please enter a valid compute request (in hours), for example, 1024.00</Form.Control.Feedback>
            </InputGroup>
            <Form.Text>Any additional comments</Form.Text>
            <Row className="mb-3">
              <InputGroup>
                <Form.Control as="textarea" rows={3} value={this.state.notes} placeholder="Please enter any additional comments" onChange={this.setnotes}/>
              </InputGroup>
            </Row>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={this.changeAllocationRequest}>
            Submit request
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

class RequestAllocation extends Component {
  render() {
    const showMdl = () => { this.props.setShow(true); }
    return <Button variant="secondary" onClick={showMdl}>Request more compute</Button>
  }
}


class ComputeTab extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (<div className="container-fluid text-center tabcontainer">
      <ChangeAllocationModal show={this.props.allocMdlShow} setShow={this.props.setAllocMdlShow} reponame={this.props.repodata.name} clustername={this.props.repodata.computeAllocation.clustername} currallocation={this.props.repodata.computeAllocation} requestChangeAllocation={this.props.requestChangeAllocation}/>
      <Row>
        <Col><div><Link to={"../compute"}>Compute </Link> / </div></Col>
        <Col><div className="sectiontitle">Resource usage for repo <span className="ref">{this.props.repodata.name}</span> on the <span className="ref">{this.props.repodata.computeAllocation.clustername}</span> cluster</div></Col>
        <Col className="mb-2">
          <span className="float-end me-1">
            <RequestAllocation setShow={this.props.setAllocMdlShow}/>
          </span>
        </Col>
      </Row>
      <TopTab repodata={this.props.repodata}/>
      <MidChart repodata={this.props.repodata}/>
      <BottomTab repodata={this.props.repodata} onAllocationChange={this.props.onAllocationChange}/>
    </div>)
  }
}

export default function Compute() {
  let params = useParams(), reponame = params.name, allocationid = params.allocationid, datayear = dayjs().year();
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame }, allocationid: allocationid } });
  const [ updateUserAllocation, { allocdata, allocloading, allocerror }] = useMutation(ALLOCATION_MUTATION);
  const [ repocmpallocfn, { repocmpallocdata, repocmpallocloading, repocmpallocerror }] = useMutation(REPO_COMPUTE_ALLOCATION_REQUEST);
  const [ allocMdlShow, setAllocMdlShow] = useState(false);


  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  let repodata = data.repos[0];
  console.log(repodata);

  let changeAllocation = (username, allocation_percent, onSuccess, onError) => {
    console.log("Changing allocation for user " + username + " to " + _.toNumber(allocation_percent));
    updateUserAllocation({ variables: { reposinput: { name: reponame }, data: [ {
      allocationid: allocationid,
      username: username,
      percent: _.toNumber(allocation_percent)
    } ] }, onCompleted: onSuccess, onError: (error) => { onError(error)} });
  }

  let requestChangeAllocation = function(qosname, newSlacHours, notes) {
    console.log("Adding a request to change allocation to " + newSlacHours);
    repocmpallocfn({ variables: { request: { reqtype: "RepoComputeAllocation", reponame: reponame, clustername: repodata.computeAllocation.clustername, qosname: qosname, slachours: _.toNumber(newSlacHours), notes: notes }}});
  }

  return (<ComputeTab repodata={repodata} onAllocationChange={changeAllocation}
    allocMdlShow={allocMdlShow} setAllocMdlShow={setAllocMdlShow} requestChangeAllocation={requestChangeAllocation}
    />);
}
