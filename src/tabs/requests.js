import _ from "lodash";
import { NavLink } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import React, { Component, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import ListGroup from 'react-bootstrap/ListGroup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faMultiply } from '@fortawesome/free-solid-svg-icons'
import { DateTimeDisp } from "./widgets";


const REQUESTS = gql`
query{
  requests {
    Id
    reqtype
    requestedby
    timeofrequest
    eppn
    username
    preferredUserName
    reponame
    facilityname
    principal
    volumename
    intent
    clustername
    qosname
    slachours
    gigabytes
    inodes
    notes
  }
}`;

const APPROVE_REQUEST_MUTATION = gql`
mutation ApproveRequest($Id: String!){
  approveRequest(id: $Id)
}
`;

const REJECT_REQUEST_MUTATION = gql`
mutation RejectRequest($Id: String!){
  rejectRequest(id: $Id)
}
`;


class Approve extends React.Component {
  constructor(props) {
    super(props);

    this.approveRequest = (event) => {
      this.props.approve(props.request, () => { this.props.removeRequest(this.props.request.Id) })
    }

    this.rejectRequest = (event) => {
      this.props.reject(props.request, () => { this.props.removeRequest(this.props.request.Id) })
    }
  }

  render() {
    return (
      <span>
        <Button variant="primary" onClick={this.approveRequest}><FontAwesomeIcon icon={faCheck}/></Button>
        <Button variant="primary" onClick={this.rejectRequest}><FontAwesomeIcon icon={faMultiply}/></Button>
      </span>
    )
  }
}

class RequestDetails extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    let req = this.props.req;
    if(this.props.req.reqtype == "UserAccount") {
      return (
        <ListGroup>
          {_.map(["eppn", "preferredUserName", "facilityname"], function(x){
            return(
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
            )
          })}
        </ListGroup>
      )
    }
    if(this.props.req.reqtype == "RepoMembership") {
      return (
        <ListGroup>
          {_.map(["username", "reponame"], function(x){
            return(
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
            )
          })}
        </ListGroup>
      )
    }
    if(this.props.req.reqtype == "NewRepo") {
      return (
        <ListGroup>
          {_.map(["reponame", "facilityname", "principal"], function(x){
            return(
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
            )
          })}
        </ListGroup>
      )
    }
    if(this.props.req.reqtype == "NewFacility") {
      return (
        <ListGroup>
          {_.map(["facilityname"], function(x){
            return(
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
            )
          })}
        </ListGroup>
      )
    }
    if(this.props.req.reqtype == "UserStorageAllocation") {
      return (
        <ListGroup>
          {_.map(["volumename", "intent", "gigabytes", "inodes"], function(x){
            return(
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
            )
          })}
        </ListGroup>
      )
    }
    if(this.props.req.reqtype == "RepoComputeAllocation") {
      return (
        <ListGroup>
          {_.map(["clustername", "qosname", "slachours"], function(x){
            return(
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
            )
          })}
        </ListGroup>
      )
    }
    return (
      <span>Details!!!</span>
    )
  }
}

class RequestsTable extends Component {
  constructor(props) {
    super(props);
    this.state = { requests: this.props.requests }

    this.removeRequest = (Id) => {
      this.setState(function(st){
        console.log("Removing request " + Id);
        st.requests = _.reject(st.requests, [ "Id", Id ]);
        return st;
      })
    }
  }



  render() {
    return (
      <>
      <div className="container-fluid text-center table-responsive">
        <table className="table table-condensed table-striped table-bordered">
          <thead><tr><th>Type</th><th>By</th><th>At</th><th>Details</th><th>Notes</th><th>Actions</th></tr></thead>
          <tbody>{
                  _.map(this.state.requests, (r) => { return (
                                <tr key={r.Id} data-id={r.Id}>
                                  <td>{r.reqtype}</td>
                                  <td>{r.requestedby}</td>
                                  <td><DateTimeDisp value={r.timeofrequest}/></td>
                                  <td><RequestDetails req={r} /></td>
                                  <td>{r.notes}</td>
                                  <td><Approve request={r} removeRequest={this.removeRequest} approve={this.props.approve} reject={this.props.reject} /></td>
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

export default function Requests() {
  const { loading, error, data } = useQuery(REQUESTS, { fetchPolicy: 'network-only'});
  const [ approveRequestMutation ] = useMutation(APPROVE_REQUEST_MUTATION);
  const [ rejectRequestMutation ] = useMutation(REJECT_REQUEST_MUTATION);

  const [err, setErr] = useState("");

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  console.log(data);

  let approve = function(request, callWhenDone) {
    approveRequestMutation({ variables: { Id: request.Id }, onCompleted: callWhenDone, onError: (error) => { setErr("Error when approving request " + error); }, refetchQueries: [ REQUESTS, 'Requests' ] });
  }
  let reject = function(request, callWhenDone) {
    rejectRequestMutation({ variables: { Id: request.Id }, onCompleted: callWhenDone, onError: (error) => { setErr("Error when rejecting request " + error); }, refetchQueries: [ REQUESTS, 'Requests' ] });
  }


  return (
    <>
    <Container fluid>
     <div className="row no-gutters">
      <h4>Pending requests</h4>
     </div>
     <div className="alert alert-danger">{err}</div>
     <RequestsTable requests={data.requests} approve={approve} reject={reject}/>
    </Container>
    </>
  );
}
