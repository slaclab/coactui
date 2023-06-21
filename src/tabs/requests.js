import _ from "lodash";
import { NavLink } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import React, { Component, useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import ListGroup from 'react-bootstrap/ListGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import Fade from 'react-bootstrap/Fade';
import Card from 'react-bootstrap/Card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faMultiply, faQuestion, faRefresh } from '@fortawesome/free-solid-svg-icons'
import { DateTimeDisp, ErrorMsgModal } from "./widgets";
import dayjs from "dayjs";


const REQUESTS = gql`
query Requests($fetchprocessed: Boolean, $showmine: Boolean, $filter: CoactRequestFilter){
  requests(fetchprocessed: $fetchprocessed, showmine: $showmine, filter: $filter) {
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
    canapprove
    canrefire
  }
  myreposandfacility {
    name
    facility
  }
  requestTypes
  requestStatuses
}`;

const APPROVE_REQUEST_MUTATION = gql`
mutation ApproveRequest($Id: String!){
  requestApprove(id: $Id)
}
`;

const REJECT_REQUEST_MUTATION = gql`
mutation RejectRequest($Id: String!, $notes: String!){
  requestReject(id: $Id, notes: $notes)
}
`;

const REFIRE_REQUEST_MUTATION = gql`
mutation RefireRequest($Id: String!){
  requestRefire(id: $Id)
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

class ReasonForRejectionModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = { notes: "" }
    this.setNotes = (event) => { this.setState({ notes: event.target.value }) }
  }

  render() {
    return (
      <Modal show={this.props.show} onHide={() => {this.props.setShow(false)}}>
        <Modal.Header closeButton>
          <Modal.Title>Explanation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        <Form>
          <Row className="mb-3">
            <InputGroup>
              <Form.Control as="textarea" rows={3} value={this.state.notes} placeholder="Please add some explanation as to the reason for rejection" onChange={this.setNotes}/>
            </InputGroup>
          </Row>
        </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {this.props.setShow(false)}}>
            Close
          </Button>
          <Button onClick={() => { this.props.setShow(false); this.props.actuallyRejectRequest(this.state.notes)}}>
            Done
          </Button>
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
      showActions: props.req.approvalstatus == "NotActedOn" && !props.showmine,
      showReasonForRejection: false
    }

    this.showHideReasonForRejection = (boolval) => {
      this.setState({showReasonForRejection: boolval})
    }

    this.actuallyRejectRequest = (notes) => {
      this.props.reject(props.req, notes)
    }

    this.actuallyApproveRequest = () => {
      this.props.approve(props.req)
    }

    this.actuallyRefireRequest = () => {
      this.props.refire(props.req)
    }

    this.requestApprove = (event) => {
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
    let actionCNm = "", refireCNm = "";
    if(!this.props.req.canapprove) {
      actionCNm =  " d-none";
    }
    if(!this.props.req.canrefire) {
      refireCNm =  " d-none";
    }

    if(!this.state.showActions) {
      if(!this.props.showmine && _.includes(["Approved", "Incomplete", "Completed"], this.props.req.approvalstatus)) {
        return (
          <span>
            <Button title="Refire this request" className={"rqAuto mx-1" + refireCNm} onClick={this.actuallyRefireRequest}><FontAwesomeIcon icon={faRefresh}/></Button>
          </span>
        )
      }
      if(!this.props.showmine && _.includes(["PreApproved"], this.props.req.approvalstatus)) {
        return (
          <span>
            <Button title="Mark this request as being approved" className={"rqAuto mx-1"} onClick={this.requestApprove}><FontAwesomeIcon icon={faCheck}/></Button>
          </span>
        )
      }
      return null;
    }
    return (
      <span>
        <ConfirmStepsModal show={this.state.showNewFacMdl} setShow={(st) => { this.setState({showNewFacMdl: st})}} title={"Manual steps for facility " + this.props.req.facilityname} actuallyApprove={this.actuallyApproveRequest} steps={["Run Wilko's script for creating a facility mountpoint", "Run Yee's script for creating facility specific partitions"]}/>
        <ReasonForRejectionModal show={this.state.showReasonForRejection} setShow={this.showHideReasonForRejection} actuallyRejectRequest={this.actuallyRejectRequest}/>
        <Button className={cNm + actionCNm} onClick={this.requestApprove}><FontAwesomeIcon icon={faCheck}/></Button>
        <Button className={actionCNm} variant="primary" onClick={() => { this.showHideReasonForRejection(true) }}><FontAwesomeIcon icon={faMultiply}/></Button>
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
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start text-truncate"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
            )
          })}
        </ListGroup>
      )
    }
    if(this.props.req.reqtype == "RepoMembership") {
      return (
        <ListGroup>
          {_.map(["username", "reponame", "facilityname"], function(x){
            return(
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start text-truncate"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
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
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start text-truncate"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
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
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start text-truncate"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
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
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start text-truncate"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
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
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start text-truncate"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
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
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start text-truncate"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
            )
          })}
        </ListGroup>
      )
    }
    if(this.props.req.reqtype == "RepoChangeComputeRequirement") {
      return (
        <ListGroup>
          {_.map(["reponame", "facilityname", "computerequirement"], function(x){
            return(
              <ListGroup.Item key={x} className="d-flex justify-content-between align-items-start text-truncate"><span className="fw-bold">{x}</span><span>{_.get(req, x)}</span></ListGroup.Item>
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
        <span title="A facility czar has not yet acted on this request">{this.props.req.approvalstatus}</span>
      )
    }
    if(this.props.req.approvalstatus == "Rejected") {
      return (
        <span title="A facility czar has denied this request">{this.props.req.approvalstatus}</span>
      )
    }
    if(this.props.req.approvalstatus == "Approved") {
      return (
        <span title="A facility czar has approved this request but the ansible scripts that actually make the changes have yet to run">{this.props.req.approvalstatus}</span>
      )
    }
    if(this.props.req.approvalstatus == "Completed") {
      return (
        <span title="A facility czar has approved this request and the ansible scripts that actually make the changes have run successfully">{this.props.req.approvalstatus}</span>
      )
    }
    if(this.props.req.approvalstatus == "Incomplete") {
      return (
        <span title="A facility czar has approved this request and the ansible scripts that actually make the changes have run but have reported errors">{this.props.req.approvalstatus}</span>
      )
    }
    if(this.props.req.approvalstatus == "PreApproved") {
      return (
        <span title="This request has already been approved and is awaiting some user action. This action will be completed the next time the user logs into the system">{this.props.req.approvalstatus}</span>
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
        <Col className="text-truncate" md={1}>{this.props.req.reqtype}</Col>
        <Col md={1}>{this.props.req.requestedby}</Col>
        <Col md={1}><DateTimeDisp value={this.props.req.timeofrequest}/></Col>
        <Col md={4}><RequestDetails req={this.props.req} /></Col>
        <Col md={3}>{this.props.req.notes}</Col>
        <Col md={1}><ApprovalStatus  req={this.props.req}/></Col>
        <Col md={1}><Approve req={this.props.req} approve={this.props.approve} reject={this.props.reject} refire={this.props.refire} showmine={this.props.showmine} /></Col>
      </Row>
    )
  }
}


class RequestsTable extends Component {
  constructor(props) {
    super(props);
  }

  componentWillUnmount() {
    this.props.setRequestsActiveTab("");
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
        <Col md={1}>Request Status</Col>
        <Col md={1}>Actions</Col>
      </Row>
      {
        _.map(this.props.requests, (r) => { return (
        <RequestsRow key={r.Id} req={r} approve={this.props.approve} reject={this.props.reject} refire={this.props.refire} showmine={this.props.showmine}/>
      )})}
      </Container>
     )
  }
}

class RequestFilters extends Component {
  constructor(props) {
    super(props);
    this.state = {
      allfacilities: _.sortBy(_.uniq(_.map(props.repofacs, "facility"))),
      allrepos: _.sortBy(_.uniq(_.map(props.repofacs, "name"))),
      selectablerepos: _.sortBy(_.uniq(_.map(props.repofacs, "name"))),
      timewindow: ""
    }

    this.setApprovalStatus = (event) => {
      this.props.applyFilter("approvalstatus", event.target.value);
    }
    this.setRequestType = (event) => {
      this.props.applyFilter("reqtype", event.target.value);
    }
    this.setFacility = (event) => { 
      this.setState({selectablerepos: _.sortBy(_.uniq(_.map(_.filter(props.repofacs, ["facility", event.target.value]), "name")))})
      this.props.applyFilter("facilityname", event.target.value);
    }
    this.setRepo = (event) => { 
      this.props.applyFilter("reponame", event.target.value);
    }
    this.setForUser = (event) => {
      console.log(event.target.value);
      this.props.applyFilter("foruser", event.target.value);
    }
    this.setTimeWindow = (event) => {
      console.log(event.target.value);
      this.setState({timewindow: event.target.value})
      let today = dayjs();
      switch(event.target.value) {
        case "LastDay":
          this.props.setTimeWindow(event.target.value, today.subtract(1, 'day'), today);
          break;
        case "LastWeek":
          this.props.setTimeWindow(event.target.value, today.subtract(1, 'week'), today);
          break;
        case "LastMonth":
          this.props.setTimeWindow(event.target.value, today.subtract(1, 'month'), today);
          break;
        case "LastYear":
          this.props.setTimeWindow(event.target.value, today.subtract(1, 'year'), today);
          break;
        default:
          this.props.setTimeWindow(event.target.value, null, null);
          break;
      }    
    }
  }

  render() {
    return (
      <Card>
        <Card.Body>
          <Form>
            <Row>
            <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="approvalstatus" value={this.props.filter.approvalstatus} onChange={this.setApprovalStatus}>
                    { _.map(this.props.requestStatuses, (q) => { return (<option key={q} value={q}>{q}</option>)}) }
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                <Form.Label>Type</Form.Label>
                  <Form.Select name="reqtype" value={this.props.filter.reqtype} onChange={this.setRequestType}>
                    <option value="">Please choose a request type</option>
                    { _.map(this.props.requestTypes, (q) => { return (<option key={q} value={q}>{q}</option>)}) }
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Facility</Form.Label>
                  <Form.Select name="facilityname" value={this.props.filter.facilityname} onChange={this.setFacility}>
                    <option value="">Please choose a facility</option>
                    { _.map(this.state.allfacilities, (q) => { return (<option key={q} value={q}>{q}</option>)}) }
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Repo</Form.Label>
                  <Form.Select name="reponame" value={this.props.filter.reponame} onChange={this.setRepo}>
                    <option value="">Please choose a repo</option>
                    { _.map(this.state.selectablerepos, (q) => { return (<option key={q} value={q}>{q}</option>)}) }
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>For user</Form.Label>
                  <Form.Control type="text" placeholder="Username regex; eg jlenn.*" defaultValue={this.props.filter.foruser} onBlur={this.setForUser}/>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Time</Form.Label>
                  <Form.Select name="timewindow" value={this.props.timeWindowLabel} onChange={this.setTimeWindow}>
                    <option key="" value="">Please choose a time window</option>
                    <option key="LastDay" value="LastDay">LastDay</option>
                    <option key="LastWeek" value="LastWeek">LastWeek</option>
                    <option key="LastMonth" value="LastMonth">LastMonth</option>
                    <option key="LastYear" value="LastYear">LastYear</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
    )
  }
}


export default function Requests(props) {
  const [filter, setFilter] = useState( { approvalstatus: "NotActedOn" } );

  const { loading, error, data, refetch } = useQuery(REQUESTS, { variables: { fetchprocessed: props.showall, showmine: props.showmine, filter: filter } }, { fetchPolicy: 'no-cache', nextFetchPolicy: 'no-cache'});
  const [ requestApproveMutation ] = useMutation(APPROVE_REQUEST_MUTATION);
  const [ requestRejectMutation ] = useMutation(REJECT_REQUEST_MUTATION);
  const [ requestRefireMutation ] = useMutation(REFIRE_REQUEST_MUTATION);

  const [showErr, setShowErr] = useState(false);
  const [errTitle, setErrTitle] = useState("Error processing request");
  const [errMessage, setErrMessage] = useState("");
  const [twlabel, setTwlabel] = useState("");

  useEffect(() => { refetch(filter).then(console.log(data))});

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  console.log(data);

  let approve = function(request, callWhenDone) {
    requestApproveMutation({ variables: { Id: request.Id }, onCompleted: callWhenDone, onError: (error) => { setErrMessage("Error when approving request " + error); setShowErr(true); }, refetchQueries: [ REQUESTS, 'Requests' ] });
  }
  let reject = function(request, notes, callWhenDone) {
    requestRejectMutation({ variables: { Id: request.Id, notes: notes }, onCompleted: callWhenDone, onError: (error) => { setErrMessage("Error when rejecting request " + error);  setShowErr(true); }, refetchQueries: [ REQUESTS, 'Requests' ] });
  }
  let refire = function(request) {
    console.log("Refiring..");
    requestRefireMutation({ variables: { Id: request.Id }, onError: (error) => { setErrMessage("Error refiring request " + error);  setShowErr(true); }, refetchQueries: [ REQUESTS, 'Requests' ] });
  }

  let applyFilter = function(attrname, attrvalue) {
    console.log("Applying filter " + attrname + " with val " + attrvalue);
    setFilter((currfilt) => {
      if(attrvalue == '') {
        currfilt[attrname] = null;
      } else {
        currfilt[attrname] = attrvalue;
      }
      return {...currfilt};
    })
  }

  let setTimeWindow = function(lbl, begin, end) {
    console.log("Setting the time window to " + lbl);
    setTwlabel(lbl);
    setFilter((currfilt) => {
      if(begin == null) {
        delete currfilt["windowbegin"];
      } else {
        currfilt["windowbegin"] = begin.toISOString();
      }
      if(end == null) {
        delete currfilt["windowend"];
      } else {
        currfilt["windowend"] = end.toISOString();
      }
      return {...currfilt};
    })
  } 


  return (
    <>
    <Container fluid id="requests">
      <RequestFilters filter={filter} applyFilter={applyFilter} timeWindowLabel={twlabel} setTimeWindow={setTimeWindow} requestTypes={data.requestTypes} requestStatuses={data.requestStatuses} repofacs={data.myreposandfacility}/>
      <ErrorMsgModal show={showErr} setShow={setShowErr} title={errTitle} message={errMessage}/>
      <RequestsTable requests={data.requests} approve={approve} reject={reject} refire={refire} showmine={props.showmine} setRequestsActiveTab={props.setRequestsActiveTab}/>
    </Container>
    </>
  );
}
