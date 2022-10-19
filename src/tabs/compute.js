import React, { Component, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from "react-bootstrap/Table";
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { useParams } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import dayjs from "dayjs";
import Plot from "react-plotly.js";
import { ChargeFactor, NodeSecs, Percent } from "./widgets";
import _ from "lodash";

const REPODETAILS = gql`
query Repos($reposinput: RepoInput $resourcename: String! $datayear: Int!){
  repos(filter:$reposinput) {
    name
    facility
    users
    facilityObj {
      name
      resources
    }
    currentComputeAllocations {
      clustername
      start
      end
      qoses {
        name
        slachours
      }
      usage {
        resource
        slacsecs
        avgcf
      }
      perDayUsage(year: $datayear) {
        year
        dayOfYear
        slacsecs
        machinesecs
        rawsecs
        avgcf
      }
      perUserUsage(year: $datayear) {
        username
        slacsecs
        machinesecs
        rawsecs
        avgcf
      }
    }
    userAllocations(resource: $resourcename) {
      facility
      resource
      repo
      username
      percent
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
      let allocated_slac_secs = _.toNumber(allocation_percent)*this.props.repoallocation*3600/100;
      let remaining_slac_secs = allocated_slac_secs - _.get(this.props.user, "slacsecs", 0);
      let remaining_percent = (remaining_slac_secs/allocated_slac_secs)*100.0;
      return {
        "allocation": _.toNumber(allocation_percent),
        "allocated_slac_secs": allocated_slac_secs,
        "remaining_slac_secs": remaining_slac_secs,
        "remaining_percent": remaining_percent
      }
    }
    this.handleChange = (event) => {
      this.props.onAllocationChange(this.props.user.username, event.target.value);
      this.setState(this.computeRemaining(event.target.value));
    }
    this.state = this.computeRemaining(_.get(this.props.user, "allocation.percent", 0));
  }

  render() {
    return (<tr data-userid={this.props.user.username}>
      <td>{this.props.user.username}</td>
      <td><input className="percent allocation_input" type="number" defaultValue={this.state.allocation} onBlur={this.handleChange}/><span className="invalid-feedback"></span></td>
      <td className="allocated"><NodeSecs value={this.state.allocated_slac_secs}/></td>
      <td className="allocated"><NodeSecs value={this.props.user.slacsecs}/></td>
      <td><ChargeFactor value={this.props.user.averageChargeFactor}/></td>
      <td className="remaining"><Percent value={this.state.remaining_percent}/></td></tr>);
    }
}

class TopTab extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (<Table striped bordered>
      <tbody>
        <tr>
          <th><label>Current allocation</label></th>
          <td>{this.props.data.current_allocation}</td>
          <th><label>SLAC hours charged</label></th>
          <td><NodeSecs value={this.props.data.slac_secs_charged}/></td>
          <th><label>Available hours</label></th>
          <td><NodeSecs value={this.props.data.available_secs}/></td>
        </tr>
        <tr>
          <th><label>Remaining %</label></th>
          <td><Percent value={this.props.data.remaining_percent}/></td>
          <th><label>Premium reached</label></th>
          <td>TBD</td>
          <th><label>Average charge factor</label></th>
          <td><ChargeFactor value={this.props.data.average_charge_factor}/></td>
        </tr>
      </tbody>
      </Table>
    );
  }
}

class BottomTab extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="btmtbl">
        <button type="button" className="btn btn-primary" onClick={this.props.updateAllocations}>Update Allocations</button>
        <div className="table-responsive">
          <table className="table table-condensed table-striped table-bordered">
            <thead><tr><th>UserID</th><th>Allocation (% of repo)</th><th>Allocated SLAC hours</th><th>Used SLAC hours</th><th>Average Charge factor</th><th>Remaining</th></tr></thead>
            <tbody>{_.map(this.props.users, (user, k) => ( <User key={user.username}  user={user} repoallocation={this.props.current_allocation} onAllocationChange={this.props.onAllocationChange}/> ))}</tbody>
          </table>
        </div>
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
            <Form.Text>Please enter the compute (in SLAC hours) needed</Form.Text>
            <InputGroup hasValidation>
              <Form.Control type="number" value={this.state.allocationRequest} value={this.state.allocationRequest} onChange={this.setAllocationRequest} isInvalid={this.state.allocationRequestInvalid}/>
              <Form.Control.Feedback type="invalid">Please enter a valid compute request (in SLAC hours), for example, 1024.00</Form.Control.Feedback>
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
      <ChangeAllocationModal show={this.props.allocMdlShow} setShow={this.props.setAllocMdlShow} reponame={this.props.reponame} clustername={this.props.resourcename} currallocation={this.props.currallocation} requestChangeAllocation={this.props.requestChangeAllocation}/>
      <Row>
        <Col></Col>
        <Col><div className="sectiontitle">Resource usage for repo <span className="ref">{this.props.reponame}</span> on the <span className="ref">{this.props.resourcename}</span> cluster</div></Col>
        <Col className="float-end mb-2">
          <RequestAllocation setShow={this.props.setAllocMdlShow}/>
        </Col>
      </Row>
      <TopTab data={this.props.toptbldata}/>
      <div className="midchart">
        <Plot data={this.props.chartdata} layout={this.props.layout}/>
      </div>
      <BottomTab users={this.props.btmtbldata} allocations={this.state} current_allocation={this.props.toptbldata.current_allocation} onAllocationChange={this.props.onAllocationChange} updateAllocations={this.props.updateAllocations}/>
    </div>)
  }
}

export default function Compute() {
  let params = useParams(), reponame = params.reponame, resourcename = params.resourcename, datayear = dayjs().year();
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame }, resourcename: resourcename, datayear: datayear } });
  const [ updateUserAllocation, { allocdata, allocloading, allocerror }] = useMutation(ALLOCATION_MUTATION);
  const [ repocmpallocfn, { repocmpallocdata, repocmpallocloading, repocmpallocerror }] = useMutation(REPO_COMPUTE_ALLOCATION_REQUEST);
  const [ allocMdlShow, setAllocMdlShow] = useState(false);


  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  let repodata = data.repos[0];
  console.log(repodata);
  let facility = repodata["facility"], allocations = _.find(_.get(repodata, "currentComputeAllocations"), ["clustername", resourcename]),
    usage = _.get(allocations, "usage[0]", {}),
    per_user_allocations = _.get(repodata, "userAllocations", []),
    per_user_usage = _.get(allocations, "perUserUsage", []),
    per_day_usage = _.get(allocations, "perDayUsage", []),
    repo_users = _.get(repodata, "users", []);
  console.log(allocations);
  let toptbldata = {
    current_allocation: _.sum(_.map(_.get(allocations, "qoses", []), "slachours")),
    current_allocation_secs: _.sum(_.map(_.get(allocations, "qoses", []), "slachours"))*3600,
    slac_secs_charged: _.get(usage, "slacsecs"),
    machine_secs_charged: _.get(usage, "machinesecs"),
    raw_secs_charged: _.get(usage, "rawsecs"),
    average_charge_factor:  _.get(usage, "avgcf")
  }
  toptbldata.available_secs = toptbldata.current_allocation_secs - toptbldata.slac_secs_charged;
  toptbldata.remaining_percent = (toptbldata.available_secs/toptbldata.current_allocation_secs)*100.0;

  // Users can come and go.. Collect all the users from the various sources.
  var users = _.fromPairs(_.map(_.union(_.map(per_user_allocations, "username"), _.map(per_user_usage, "username"), repo_users), u=> [u, {username: u, allocated_slac_secs: 0, remaining_slac_secs: 0, remaining_percent: 100}]));
  _.each(per_user_allocations, function(v,k){ users[v["username"]]["allocation"] = _.cloneDeep(v) });
  _.each(per_user_usage, function(pu){
    let u = users[pu["username"]];
    _.each(["slacsecs", "machinesecs", "rawsecs", "avgcf"], function(at) { u[at] = pu[at]; })
    u["allocated_slac_secs"] = _.get(u, "allocation.percent", 0)*toptbldata.current_allocation_secs/100;
    u["remaining_slac_secs"] = u["allocated_slac_secs"] - _.get(u, "slacsecs");
    u["remaining_percent"] = (u["remaining_slac_secs"]/u["allocated_slac_secs"])*100.0;
    u["averageChargeFactor"] = _.get(u, "slacsecs", 0)/_.get(u, "rawsecs", 0);
  });
  // console.log(users);

  let layout = { showlegend: true, legend: { x: 0.075, xanchor: 'center', y: 0.98, font: { family: 'Optima, Helevetica, Lucida Grande, Lucida Sans, sans-serif', size: 14, color: '#000' } }, autosize: false, width: window.innerWidth, height: 0.4*window.innerHeight, margin: { t: 0, b: -0.1 } };
  let uniform_charge_rate = { x: [], y: [], type: 'scatter', name: "Uniform Charge Rate" }, daily_charge_rate = { x: [], y: [], type: 'scatter', "name": "SLAC hours charged" };
  let daily_usage_by_day = _.keyBy(per_day_usage, "dayOfYear"), avg_allocation = toptbldata.current_allocation/(dayjs().endOf("year").diff(dayjs().startOf('year'), "days")), cuml_daily_usage = 0, today = dayjs();
  for(let i=0, d = dayjs().startOf('year'); d.isBefore(dayjs().endOf("year")); d = d.add(1, "days"), i=i+1) {
    uniform_charge_rate.x.push(d.toDate()); uniform_charge_rate.y.push(i*avg_allocation);
    if(d.isBefore(today)){ daily_charge_rate.x.push(d.toDate()); cuml_daily_usage = cuml_daily_usage + (_.get(daily_usage_by_day, i+1+".slacsecs", 0))/3600.0; daily_charge_rate.y.push(cuml_daily_usage); }
  }
  var chartdata = [uniform_charge_rate, daily_charge_rate];

  let changeAllocation = (username, allocation_percent) => {
    console.log("Changing allocation for user " + username + " to " + _.toNumber(allocation_percent));
    let allc = {};
    _.set(users[username], "allocation.percent", _.toNumber(allocation_percent));
    console.log(users[username]);
    console.log(users);
  }

  let updateAllocations = function() {
    console.log("Update allocations");
    console.log(users);
    let data = _.map(users, (u,k) => {
      return {
        facility: facility,
        resource: resourcename,
        repo: reponame,
        username: u["username"],
        percent: _.get(u, "allocation.percent", 0)
      }
    })
    console.log(data);
    updateUserAllocation({ variables: { reposinput: { name: reponame }, data: data } });
  }

  let requestChangeAllocation = function(qosname, newSlacHours, notes) {
    console.log("Adding a request to change allocation to " + newSlacHours);
    repocmpallocfn({ variables: { request: { reqtype: "RepoComputeAllocation", reponame: reponame, clustername: resourcename, qosname: qosname, slachours: _.toNumber(newSlacHours), notes: notes }}});
  }

  return (<ComputeTab currallocation={allocations} reponame={reponame} resourcename={resourcename} toptbldata={toptbldata} btmtbldata={users}
    chartdata={chartdata} layout={layout} onAllocationChange={changeAllocation} updateAllocations={updateAllocations}
    allocMdlShow={allocMdlShow} setAllocMdlShow={setAllocMdlShow} requestChangeAllocation={requestChangeAllocation}
    />);
}
