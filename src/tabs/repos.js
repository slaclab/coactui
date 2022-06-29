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

const REPOS = gql`
query{
  myRepos {
    name
    principal
    facilityObj {
      name
    }
  }
  whoami {
    username
  }
}`;


const REQUEST_REPOMEMBERSHIP_MUTATION = gql`
mutation repoMembershipRequest($request: SDFRequestInput!){
  repoMembershipRequest(request: $request){
    Id
  }
}
`;


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
                  _.map(this.props.repos, (r) => { return (
                                <tr key={r.name} data-name={r.name}>
                                  <td><NavLink to={`/repos/${r.name}`} key={r.name}>{r.name}</NavLink></td>
                                  <td>{r.facilityObj.name}</td>
                                  <td>{r.principal}</td>
                                  <td>TBD</td>
                                  <td>TBD</td>
                                  <td>TBD</td>
                                  <td>TBD</td>
                                </tr>
                              )})
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
    return <Button variant="primary" onClick={showMdl}>Request Repo Membership</Button>
  }
}

class RequestNewRepo extends Component {
  render() {
    return <Button variant="secondary">Request New Repo</Button>
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


export default function Repos() {
  const { loading, error, data } = useQuery(REPOS);
  const [show, setShow] = useState(false);
  const [ repomemnrshipfn, { rmdata, rmloading, rmerror }] = useMutation(REQUEST_REPOMEMBERSHIP_MUTATION);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  let username = _.get(data, "whoami.username");

  const requestRepoMembership = (reponame) => {
    console.log("Repo membership requested for repo " + reponame);
    repomemnrshipfn({ variables: { request: { reqtype: "RepoMembership", reponame: reponame }}});
    setShow(false);
  };

  return (
    <>
    <Container fluid>
    <ReqRepMembership show={show} setShow={setShow} username={username} requestRepoMembership={requestRepoMembership} />
     <div className="row no-gutters">
      <Row>
        <Col></Col>
        <Col></Col>
        <Col className="float-end">
          <RequestAddToRepo setShow={setShow} />
          <RequestNewRepo />
        </Col>
      </Row>
     </div>
    </Container>

    <ReposTable repos={data.myRepos} />
    </>
  );
}
