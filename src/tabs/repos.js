import _ from "lodash";
import { NavLink } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import React, { Component, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { NodeSecs } from "./widgets";

const REPOS = gql`
query{
  myRepos {
    name
    principal
    facilityObj {
      name
    }
    currentAllocations(resource:null) {
      resource
      start
      end
      qoses {
        name
        slachours
      }
      volumes {
        name
        purpose
        gigabytes
        inodes
      }
    }
    usage(resource:null) {
      resource
      qos
      slacsecs
      avgcf
    }
  }
  whoami {
    username
  }
  facilities {
    name
  }
}`;


const REQUEST_REPOMEMBERSHIP_MUTATION = gql`
mutation repoMembershipRequest($request: SDFRequestInput!){
  repoMembershipRequest(request: $request){
    Id
  }
}
`;
const REQUEST_NEWREPO_MUTATION = gql`
mutation newRepoRequest($request: SDFRequestInput!){
  newRepoRequest(request: $request){
    Id
  }
}
`;

class ReposRow extends Component {
  constructor(props) {
    super(props);
    this.totalSlachours = _.sum(_.map(_.get(_.find(_.get(this.props.repo, "currentAllocations", []), ["resource", "compute"]), "qoses"), "slachours"))
    this.totalGigabytes = _.sum(_.map(_.get(_.find(_.get(this.props.repo, "currentAllocations", []), ["resource", "storage"]), "volumes"), "gigabytes"))
    this.totalSlacSecsused = _.sum(_.map(_.get(this.props.repo, "usage", []), "slacsecs"));
  }
  render() {
    return (
      <tr data-name={this.props.repo.name}>
        <td><NavLink to={`/repos/${this.props.repo.name}`} key={this.props.repo.name}>{this.props.repo.name}</NavLink></td>
        <td>{this.props.repo.facilityObj.name}</td>
        <td>{this.props.repo.principal}</td>
        <td>{this.totalSlachours}</td>
        <td><NodeSecs value={this.totalSlacSecsused}/></td>
        <td>{this.totalGigabytes}</td>
        <td>TBD</td>
      </tr>)
  }
}


class ReposTable extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <>
      <div className="container-fluid text-center table-responsive">
        <table className="table table-condensed table-striped table-bordered">
          <thead><tr><th>Name</th><th>Facility</th><th>PI</th><th>Total compute allocation</th><th>Total compute used</th><th>Total storage allocation</th><th>Total storage used</th></tr></thead>
          <tbody>{
                  _.map(this.props.repos, (r) => { return (<ReposRow key={r.name} repo={r}/>) })
                    }
            </tbody>
          </table>
        </div>
      </>
     )
  }
}

class RequestAddToRepo extends Component {
  render() {
    const showMdl = () => {  this.props.setShow(true); }
    return <Button variant="secondary" onClick={showMdl}>Request Repo Membership</Button>
  }
}

class RequestNewRepo extends Component {
  render() {
    const showMdl = () => {  this.props.setShow(true); }
    return <Button variant="secondary" onClick={showMdl}>Request New Repo</Button>
  }
}

class ReqRepMembership extends Component {
  constructor(props) {
    super(props);
    this.state = { reponame: "", reponameInvalid: false }
    this.handleClose = () => { this.props.setShow(false); }
    this.requestRepoMembership = () => {
      console.log(this.state.reponame);
      if(_.isEmpty(this.state.reponame)) {
        this.setState({ reponameInvalid: true });
        return;
      }
      this.props.requestRepoMembership(this.state.reponame);
      this.props.setShow(false);
    }
    this.setRepoName = (event) => { this.setState({ reponame: event.target.value }) }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Request membership in repo</Modal.Title>
        </Modal.Header>
        <Modal.Body>Request membership in this repo for {this.props.username}
          <InputGroup hasValidation>
            <Form.Control type="text" placeholder="Enter name of the repo" onChange={this.setRepoName} isInvalid={this.state.reponameInvalid}/>
            <Form.Control.Feedback type="invalid">Please enter a valid repo name. If you do not know the reponame, please ask your PI for the name.</Form.Control.Feedback>
          </InputGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={this.requestRepoMembership}>
            Request Account
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

class ReqNewRepo extends Component {
  constructor(props) {
    super(props);
    this.state = { reponame: "", reponameInvalid: false, facility: "", facilityInvalid: false, principal: this.props.username, principalInvalid: "" }
    this.handleClose = () => { this.props.setShow(false); }
    this.requestNewRepo = () => {
      console.log(this.state);
      if(_.isEmpty(this.state.reponame)) {
        this.setState({ reponameInvalid: true });
        return;
      }
      this.setState({ reponameInvalid: false });
      if(_.isEmpty(this.state.facility)) {
        this.setState({ facilityInvalid: true });
        return;
      }
      if(_.isEmpty(this.state.principal)) {
        this.setState({ principalInvalid: true });
        return;
      }

      this.props.requestNewRepo({reponame: this.state.reponame, facility: this.state.facility, principal: this.state.principal});
      this.props.setShow(false);
    }
    this.setRepoName = (event) => { this.setState({ reponame: event.target.value }) }
    this.setFacility = (event) => { this.setState({ facility: event.target.value }) }
    this.setPrincipal = (event) => { this.setState({ principal: event.target.value }) }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Request new repo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup hasValidation>
            <Row>
              <Col md={3}><Form.Label className="px-2" >Repo name:</Form.Label></Col>
              <Col>
                <Form.Control type="text" placeholder="Enter name of the repo" onChange={this.setRepoName} isInvalid={this.state.reponameInvalid}/>
                <Form.Control.Feedback type="invalid">Please enter a valid repo name</Form.Control.Feedback>
              </Col>
            </Row>
          </InputGroup>
          <InputGroup hasValidation>
            <Row>
              <Col md={3}><Form.Label className="px-2" >Facility:</Form.Label></Col>
              <Col>
                <Form.Control required as="select" type="select" onChange={this.setFacility} isInvalid={this.state.facilityInvalid}>
                <option value="">Please select a facility</option>
                {
                  _.map(this.props.facilities, function(x){ return ( <option key={x} value={x}>{x}</option> ) })
                }
                </Form.Control>
                <Form.Control.Feedback type="invalid">Please select a facility</Form.Control.Feedback>
              </Col>
            </Row>
          </InputGroup>
          <InputGroup hasValidation>
          <Row>
            <Col md={3}><Form.Label className="px-2" >Principal:</Form.Label></Col>
            <Col>
              <Form.Control type="text" placeholder="Enter principal's userid" value={this.state.principal} onChange={this.setPrincipal} isInvalid={this.state.principalInvalid}/>
              <Form.Control.Feedback type="invalid">Please enter a valud userid</Form.Control.Feedback>
              </Col>
            </Row>
          </InputGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={this.requestNewRepo}>
            Request Repo
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

export default function Repos() {
  const { loading, error, data } = useQuery(REPOS);
  const [repMemShow, setRepMemShow] = useState(false);
  const [newRepShow, setNewRepShow] = useState(false);
  const [ repomemnrshipfn, { rmdata, rmloading, rmerror }] = useMutation(REQUEST_REPOMEMBERSHIP_MUTATION);
  const [ newrepofn, { nrdata, nrloading, nrerror }] = useMutation(REQUEST_NEWREPO_MUTATION);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  let username = _.get(data, "whoami.username");
  let facilities = _.map(_.get(data, "facilities"), "name");
  console.log(data);

  const requestRepoMembership = (reponame) => {
    console.log("Repo membership requested for repo " + reponame);
    repomemnrshipfn({ variables: { request: { reqtype: "RepoMembership", reponame: reponame }}});
    setRepMemShow(false);
  };

  const requestNewRepo = (repodetails) => {
    console.log("New repo requested Name: " + repodetails["reponame"] + " Facility: " + repodetails["facility"] + " Principal: " + repodetails["principal"]);
    newrepofn({ variables: { request: { reqtype: "NewRepo", reponame: repodetails.reponame, facilityname: repodetails.facility, principal: repodetails.principal }}});
    setNewRepShow(false);
  };


  return (
    <>
    <Container fluid>
    <ReqRepMembership show={repMemShow} setShow={setRepMemShow} username={username} requestRepoMembership={requestRepoMembership} />
    <ReqNewRepo show={newRepShow} setShow={setNewRepShow} username={username} requestNewRepo={requestNewRepo}  facilities={facilities}/>
     <div className="row no-gutters">
      <Row>
        <Col></Col>
        <Col></Col>
        <Col className="float-end">
          <RequestAddToRepo setShow={setRepMemShow} />
          <RequestNewRepo setShow={setNewRepShow}/>
        </Col>
      </Row>
     </div>
    </Container>

    <ReposTable repos={data.myRepos} />
    </>
  );
}
