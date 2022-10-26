import React, { Component, useState } from 'react';
import _ from "lodash";
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faPerson, faPersonCircleQuestion } from '@fortawesome/free-solid-svg-icons'
import { NoNavHeader, Footer } from "./tabs/widgets";
import { useQuery, useMutation, gql } from "@apollo/client";
import { Formik } from 'formik';
import * as yup from 'yup';


const FACNREPOS = gql`
query allreposandfacility {
  allreposandfacility {
    name
    facility
  }
}
`;


const REQUEST_USERACCOUNT_MUTATION = gql`
mutation newSDFAccountRequest($request: SDFRequestInput!){
  newSDFAccountRequest(request: $request){
    Id
  }
}
`;

const schema = yup.object().shape({
  userName: yup.string().required().min(5, "Usernames must be 5 characters or more").max(15, "Usernames cannot be more than 15 characters"),
  facility: yup.string().required()
});

function UserIdForm(props) {
  return (
    <Formik
      validationSchema={schema}
      onSubmit={values => { props.handleSubmit(values.userName); }}
      initialValues={{
        userName: props.preferredUserName,
        facility: props.selectedFacility
      }}
      validateOnChange={true}
      validateOnBlur={true}
    >
      {({
        handleSubmit,
        handleChange,
        handleBlur,
        values,
        touched,
        isValid,
        errors,
      }) => (
        <Form noValidate onSubmit={handleSubmit}>
          <Modal.Body>Enable your EPPN <span className="text-primary"><b>{props.eppn}</b></span> for the SDF.
            <Row className="mt-3">
              <Form.Group as={Col} md="4" controlId="validationFormik01" className="position-relative">
                <Form.Label>Username: <span className="text-primary"><b>{values.userName}</b></span></Form.Label>
              </Form.Group>
            </Row>
            <Row className="mb-3">
              <Form.Group as={Col} md="4" controlId="validationFormik02" className="position-relative">
                <Form.Label>Which facility will you using?</Form.Label>
                <Form.Select name="facility" value={values.facility} isValid={touched.facility && !errors.facility} isInvalid={touched.facility && errors.facility} onChange={(e) => { values.facility = e.target.value; props.handleFacility(values.facility)}} onBlur={handleBlur}>
                  <option value="">Please select a facility</option>
                  { _.map(_.uniq(_.map(props.repos, "facility")), (f) => { return (<option key={f} value={f}>{f}</option>)}) }
                </Form.Select>
                <Form.Control.Feedback type='invalid' tooltip>{errors.facility}</Form.Control.Feedback>
              </Form.Group>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={props.handleClose}>Close</Button>
            <Button type="submit">Request Account</Button>
          </Modal.Footer>

        </Form>
      )}
    </Formik>
  );
}

class ReqUserAccount extends Component {
  constructor(props) {
    super(props);
    this.handleClose = () => { this.props.setShow(false); }
    this.requestAccount = (preferredUserName) => {
      this.props.requestUserAccount(preferredUserName);
      this.props.setShow(false);
    }
    this.setPreferredUserid = (event) => { this.setState({ preferredUserName: event.target.value }) }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Request an SDF account</Modal.Title>
        </Modal.Header>
        <UserIdForm handleSubmit={this.requestAccount} preferredUserName={_.split(this.props.eppn, "@")[0]} handleClose={this.handleClose} eppn={this.props.eppn} repos={this.props.repos} handleFacility={this.props.handleFacility} selectedFacility={this.props.selectedFacility}/>
      </Modal>
      )
  }
}

export default function RegisterUser(props) {
  const { loading, error, data } = useQuery(FACNREPOS);
  const [ requestUserAccount, { uudata, uuloading, uuerror }] = useMutation(REQUEST_USERACCOUNT_MUTATION);
  const [show, setShow] = useState(false);
  const [facility, setFacility] = useState("");
  const requestAccount = (preferredUserName) => {
    console.log("Account requested for eppn " + props.eppn + " and preferred userid " + preferredUserName);
    requestUserAccount({ variables: { request: { reqtype: "UserAccount", eppn: props.eppn, preferredUserName: preferredUserName, "facilityname": facility }}});
    setShow(false);
  };
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleFacility = (selectedFacilty) => {
    setFacility(selectedFacilty);
    console.log("Setting facility to " + selectedFacilty);
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  console.log(data)

  if (props.registrationPending) {
    return (
      <>
      <div className="registeruser d-flex flex-column">
         <NoNavHeader/>
         <h6 className="p-2">Hi <span className="text-primary">{props.fullname}</span>, welcome to Coact; the portal for using the SDF.</h6>
         <div className="p-2 flex-grow-1">
          Your request to enable the EPPN <span className="text-primary"><b>{props.eppn}</b></span> for SDF is still pending and will be acted upon soon.
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
      <h6 className="p-2">Hi <span className="text-primary">{props.fullname}</span>, welcome to Coact; the portal for using the SDF.</h6>
      <div className="p-2 flex-grow-1">
        You don't seem to have an SDF account associated with your EPPN <span className="text-primary"><b>{props.eppn}</b></span>.
        If you would like to request your account be enabled for SDF, please click here -
        <button type="button" className="btn btn-primary" onClick={handleShow}>Enable my SDF account</button>
      </div>
      <ReqUserAccount show={show} setShow={setShow} eppn={props.eppn} requestUserAccount={requestAccount} repos={data.allreposandfacility} handleFacility={handleFacility} selectedFacility={facility} />
      <Footer/>
    </div>
    </>
  );
}
