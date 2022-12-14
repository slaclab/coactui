import _ from "lodash";
import React, { Component, useState } from 'react';
import { Link, Outlet } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { ToolbarButton } from './widgets'

import ReposComputeListView from "./reposcompute";
import ReposStorageListView from "./reposstorage";

const WHOAMI = gql`
query{
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
            Request Repo Membership
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

export default function RepoTabs(props) {
  const { loading, error, data } = useQuery(WHOAMI);
  const [repMemShow, setRepMemShow] = useState(false);
  const [newRepShow, setNewRepShow] = useState(false);
  const [toolbaritems, setToolbaritems] = useState([
    ["Request Repo Membership", setRepMemShow ],
    ["Request New Repo", setNewRepShow ]
  ]);
  const [ repomemnrshipfn, { rmdata, rmloading, rmerror }] = useMutation(REQUEST_REPOMEMBERSHIP_MUTATION);
  const [ newrepofn, { nrdata, nrloading, nrerror }] = useMutation(REQUEST_NEWREPO_MUTATION);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  let username = _.get(data, "whoami.username");
  let facilities = _.map(_.get(data, "facilities"), "name");

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

  return (<Tab.Container activeKey={props.reposActiveTab}>
        <Row id="repotabs">
          <Col>
            <Nav variant="tabs" onSelect={(selKey) => { props.setReposActiveTab(selKey); }}>
              <Nav.Item>
                <Nav.Link eventKey="users" as={Link} to={`users`}>Users</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="groups" as={Link} to={`groups`}>Access groups</Nav.Link>
              </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="compute" as={Link} to={`compute`}>Compute</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="storage" as={Link} to={`storage`}>Storage</Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>
            <Col md={5}>
              <span className="float-end me-1">
              {
                _.map(toolbaritems, (x) => { return <ToolbarButton key={x[0]} label={x[0]} setShow={x[1]} /> })
              }
              </span>
            </Col>
        </Row>
        <Tab.Content>
          <Outlet context={[toolbaritems, setToolbaritems]}/>
        </Tab.Content>
        <ReqRepMembership show={repMemShow} setShow={setRepMemShow} username={username} requestRepoMembership={requestRepoMembership} />
        <ReqNewRepo show={newRepShow} setShow={setNewRepShow} username={username} requestNewRepo={requestNewRepo}  facilities={facilities}/>
    </Tab.Container>);
}
