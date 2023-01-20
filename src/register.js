import React, { Component, useState } from 'react';
import _ from "lodash";
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { Navigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faPerson, faPersonCircleQuestion } from '@fortawesome/free-solid-svg-icons'
import { NoNavHeader, Footer } from "./tabs/widgets";
import { useQuery, useMutation, gql } from "@apollo/client";

const FACNAMES = gql`
query facilityNames {
  facilityNames
  amIRegistered {
    isRegistered
    isRegistrationPending
    eppn
    fullname
  }
}
`;


const REQUEST_USERACCOUNT_MUTATION = gql`
mutation newSDFAccountRequest($request: CoactRequestInput!){
  newSDFAccountRequest(request: $request){
    Id
  }
}
`;

class ReqUserAccount extends Component {
  constructor(props) {
    super(props);
    this.handleClose = () => { this.props.setShow(false); }
    this.requestAccount = () => {
      const selFac = this.state.facility;
      if(_.isEmpty(selFac) || !_.includes(this.props.facilityNames, selFac)) {
        this.setState({facilityInvalid: true});
        return;
      }

      this.props.requestUserAccount(selFac);
      this.props.setShow(false);
    }
    this.state = { facility: "", facilityInvalid: false }
    this.setFacility = (event) => { this.setState({ facility: event.target.value }); }
  }

  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Request an SDF account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Form.Text>Enable your EPPN <span className="text-primary"><b>{this.props.eppn}</b></span> for the SDF</Form.Text>
            <InputGroup hasValidation>
              <Form.Select name="facility" onChange={this.setFacility} isInvalid={this.state.facilityInvalid}>
                <option value="">Please choose a facility</option>
                { _.map(this.props.facilityNames, (f) => { return (<option key={f} value={f}>{f}</option>)}) }
              </Form.Select>
              <Form.Control.Feedback type="invalid">Please choose a valid facility.</Form.Control.Feedback>
            </InputGroup>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.props.handleClose}>Close</Button>
          <Button type="submit" onClick={this.requestAccount} >Request Account</Button>
        </Modal.Footer>
      </Modal>
      )
  }
}

export default function RegisterUser(props) {
  const { loading, error, data } = useQuery(FACNAMES);
  const [ requestUserAccount, { uudata, uuloading, uuerror }] = useMutation(REQUEST_USERACCOUNT_MUTATION);
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  console.log(data)

  let hasUserAcc = _.get(data, "amIRegistered.isRegistered", false);
  let eppn = _.get(data, "amIRegistered.eppn", null);
  let registrationPending = _.get(data, "amIRegistered.isRegistrationPending", false);
  let isRegistered = _.get(data, "amIRegistered.isRegistered", false);
  let fullname = _.get(data, "amIRegistered.fullname", "");

  const requestAccount = (selectedFacility) => {
    const preferredUserName = _.split(eppn, "@")[0];
    console.log("Account requested for eppn " + eppn + " in facility "  + selectedFacility + " with preferred username " + preferredUserName);
    requestUserAccount({ variables: { request: { reqtype: "UserAccount", eppn: eppn, preferredUserName: preferredUserName, "facilityname": selectedFacility }}, refetchQueries: [ FACNAMES, 'amIRegistered' ]});
    setShow(false);
  };

  if(isRegistered) {
    return (
      <Navigate to="../myprofile" replace />
    );
  }

  if (registrationPending) {
    return (
      <>
      <div className="registeruser d-flex flex-column">
         <NoNavHeader/>
         <h6 className="p-2">Hi <span className="text-primary">{fullname}</span>, welcome to Coact; the portal for using the SDF.</h6>
         <div className="p-2 flex-grow-1">
          Your request to enable the EPPN <span className="text-primary"><b>{eppn}</b></span> for SDF is still pending and will be acted upon soon.
         </div>
         <Footer/>
      </div>
      </>
    );
  }

  return (
    <>
    <div className="registeruser d-flex flex-column">
      <NoNavHeader/>
      <h6 className="p-2">Hi <span className="text-primary">{fullname}</span>, welcome to Coact; the portal for using the SDF.</h6>
      <div className="p-2 flex-grow-1">
        You don't seem to have an SDF account associated with your EPPN <span className="text-primary"><b>{eppn}</b></span>.
        If you would like to request your account be enabled for SDF, please click here -
        <button type="button" className="btn btn-primary" onClick={handleShow}>Enable my SDF account</button>
      </div>
      <ReqUserAccount show={show} setShow={setShow} eppn={eppn} requestUserAccount={requestAccount} facilityNames={data.facilityNames} />
      <Footer/>
    </div>
    </>
  );
}
