import _ from "lodash";
import { NavLink } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import React, { Component, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import ListGroup from 'react-bootstrap/ListGroup';
import Modal from 'react-bootstrap/Modal';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import Fade from 'react-bootstrap/Fade';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faMultiply, faQuestion } from '@fortawesome/free-solid-svg-icons'
import { DateTimeDisp, ErrorMsgModal } from "./widgets";


const REQUESTS = gql`
query Requests($fetchprocessed: Boolean, $showmine: Boolean){
  requests(fetchprocessed: $fetchprocessed, showmine: $showmine) {
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
    allocationid
    clustername
    storagename
    qosname
    purpose
    slachours
    gigabytes
    notes
    approvalstatus
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

class ConfirmStepsModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = { allDone: false, stepChecks: _.fromPairs(_.map(props.steps, (s) => { return [s, false] })) }
    this.stepCheckChange = (step, ck) => {
      this.setState((st) => {
        st["stepChecks"][step] = ck;
        st.allDone = _.every(_.values(st["stepChecks"]));
        return st;
      })
    }
  }

  render() {
    return (
      <Modal show={this.props.show} onHide={() => {this.props.setShow(false)}}>
        <Modal.Header closeButton>
          <Modal.Title>{this.props.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        <Row className="mb-2">Please make sure you have performed these steps.</Row>
        <Form>
        {
            _.map(this.props.steps, (s) => { return <Form.Check key={s} checked={this.state.stepChecks[s]} onChange={(event) => this.stepCheckChange(s, event.target.checked)} label={s}/>})
        }
        </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {this.props.setShow(false)}}>
            Close
          </Button>
          <Fade in={this.state.allDone}>
            <Button onClick={() => {this.props.setShow(false); this.props.actuallyApprove()}}>
              Approve
            </Button>
          </Fade>
        </Modal.Footer>
      </Modal>
    )
  }
}



class Approve extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showNewFacMdl: false,
      showActions: props.req.approvalstatus == "NotActedOn" && !props.showmine
    }

    this.rejectRequest = (event) => {
      this.props.reject(props.req)
    }
    this.actuallyApproveRequest = () => {
      this.props.approve(props.req)
    }
    this.approveRequest = (event) => {
      if(this.props.req.reqtype== "NewFacility") {
        this.setState({showNewFacMdl: true});
        return;
      }
      this.actuallyApproveRequest();
    }
  }

  render() {
    let cNm = "rqAuto mx-1";
    if(_.includes(["NewFacility"], this.props.req.reqtype)) { cNm = "rqManual mx-1"; }

    if(!this.state.showActions) {
      return null;
    }
    return (
      <span>
        <ConfirmStepsModal show={this.state.showNewFacMdl} setShow={(st) => { this.setState({showNewFacMdl: st})}} title={"Manual steps for facility " + this.props.req.facilityname} actuallyApprove={this.actuallyApproveRequest} steps={["Run Wilko's script for creating a facility mountpoint", "Run Yee's script for creating facility specific partitions"]}/>
        <Button className={cNm} onClick={this.approveRequest}><FontAwesomeIcon icon={faCheck}/></Button>
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
          {_.map(["storagename", "purpose", "gigabytes"], function(x){
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
          {_.map(["reponame", "clustername", "qosname", "slachours"], function(x){
            return(
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
            )
          })}
        </ListGroup>
      )
    }
    if(this.props.req.reqtype == "RepoStorageAllocation") {
      return (
        <ListGroup>
          {_.map(["reponame", "storagename", "purpose", "gigabytes"], function(x){
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

class ApprovalStatus extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    if(this.props.req.approvalstatus == "NotActedOn") {
      return (
        <span>Pending</span>
      )
    }
    if(this.props.req.approvalstatus == "Rejected") {
      return (
        <span>No</span>
      )
    }
    if(this.props.req.approvalstatus == "Approved") {
      return (
        <span>Yes</span>
      )
    }
  }
}

class RequestsRow extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <Row data-id={this.props.req.Id}>
        <Col md={1}>{this.props.req.reqtype}</Col>
        <Col md={1}>{this.props.req.requestedby}</Col>
        <Col md={1}><DateTimeDisp value={this.props.req.timeofrequest}/></Col>
        <Col md={4}><RequestDetails req={this.props.req} /></Col>
        <Col md={3}>{this.props.req.notes}</Col>
        <Col md={1}><ApprovalStatus  req={this.props.req}/></Col>
        <Col md={1}><Approve req={this.props.req} approve={this.props.approve} reject={this.props.reject} showmine={this.props.showmine} /></Col>
      </Row>
    )
  }
}


class RequestsTable extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Container fluid className="rqsttbl">
      <Row>
        <Col md={1}>Type</Col>
        <Col md={1}>By</Col>
        <Col md={1}>At</Col>
        <Col md={4}>Details</Col>
        <Col md={3}>Notes</Col>
        <Col md={1}>Approved</Col>
        <Col md={1}>Actions</Col>
      </Row>
      {
        _.map(this.props.requests, (r) => { return (
        <RequestsRow key={r.Id} req={r} approve={this.props.approve} reject={this.props.reject} showmine={this.props.showmine}/>
      )})}
      </Container>
     )
  }
}

export default function Requests(props) {
  const { loading, error, data } = useQuery(REQUESTS, { variables: { fetchprocessed: props.showall, showmine: props.showmine } }, { fetchPolicy: 'no-cache', nextFetchPolicy: 'no-cache'});
  const [ approveRequestMutation ] = useMutation(APPROVE_REQUEST_MUTATION);
  const [ rejectRequestMutation ] = useMutation(REJECT_REQUEST_MUTATION);

  const [showErr, setShowErr] = useState(false);
  const [errTitle, setErrTitle] = useState("Error processing request");
  const [errMessage, setErrMessage] = useState("");

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  console.log(data);

  let approve = function(request, callWhenDone) {
    approveRequestMutation({ variables: { Id: request.Id }, onCompleted: callWhenDone, onError: (error) => { setErrMessage("Error when approving request " + error); setShowErr(true); }, refetchQueries: [ REQUESTS, 'Requests' ] });
  }
  let reject = function(request, callWhenDone) {
    rejectRequestMutation({ variables: { Id: request.Id }, onCompleted: callWhenDone, onError: (error) => { setErrMessage("Error when rejecting request " + error);  setShowErr(true); }, refetchQueries: [ REQUESTS, 'Requests' ] });
  }


  return (
    <>
    <Container fluid id="requests">
     <ErrorMsgModal show={showErr} setShow={setShowErr} title={errTitle} message={errMessage}/>
     <RequestsTable requests={data.requests} approve={approve} reject={reject} showmine={props.showmine}/>
    </Container>
    </>
  );
}
