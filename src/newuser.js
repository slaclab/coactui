import React, { Component, useState } from 'react';
import _ from "lodash";
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useMutation, gql } from "@apollo/client";
import { Formik } from 'formik';
import * as yup from 'yup';

const REQUEST_USERACCOUNT_MUTATION = gql`
mutation newSDFAccountRequest($request: SDFRequestInput!){
  newSDFAccountRequest(request: $request){
    Id
  }
}
`;

const schema = yup.object().shape({
  userName: yup.string().required().min(5, "Usernames must be 5 characters or more").max(15, "Usernames cannot be more than 15 characters"),
});

function UserIdForm(props) {
  return (
    <Formik
      validationSchema={schema}
      onSubmit={values => { console.log("Submitting"); alert(JSON.stringify(values, null, 2)); props.handleSubmit(); }}
      initialValues={{
        userName: props.preferredUserName,
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
          <Row className="mb-3">
            <Form.Group as={Col} md="4" controlId="validationFormik01" className="position-relative">
              <Form.Label>Preferred username</Form.Label>
              <Form.Control
                type="text"
                name="userName"
                value={values.userName}
                onChange={handleChange}
                onBlur={handleBlur}
                isValid={touched.userName && !errors.userName}
                isInvalid={touched.userName && errors.userName}
              />
              <Form.Control.Feedback type='invalid' tooltip>{errors.userName}</Form.Control.Feedback>
            </Form.Group>
          </Row>
          <Button type="submit">Request Account</Button>
        </Form>
      )}
    </Formik>
  );
}

class ReqUserAccount extends Component {
  constructor(props) {
    super(props);
    this.state = { preferredUserName: _.split(this.props.eppn, "@")[0], userNameInvalid: false }
    this.handleClose = () => { this.props.setShow(false); }
    this.requestAccount = () => {
      console.log(this.state.preferredUserName);
      if(_.isEmpty(this.state.preferredUserName)) {
        this.setState({ userNameInvalid: true });
        return;
      }
      this.props.requestUserAccount(this.state.preferredUserName);
      this.props.setShow(false);
    }
    this.setPreferredUserid = (event) => { this.setState({ preferredUserName: event.target.value }) }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Request an SDF account</Modal.Title>
        </Modal.Header>
        <Modal.Body>Request an SDF account for {this.props.eppn}. Please choose a username.
          <UserIdForm handleSubmit={this.requestAccount} preferredUserName={this.state.preferredUserName}/>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      )
  }
}

export default function NewUser(props) {
  const [ requestUserAccount, { uudata, uuloading, uuerror }] = useMutation(REQUEST_USERACCOUNT_MUTATION);
  const [show, setShow] = useState(false);
  const requestAccount = () => {
    console.log("Account requested");
    requestUserAccount({ variables: { request: { reqtype: "UserAccount", eppn: props.eppn }}});
    setShow(false);
  };
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  if (props.registrationPending) {
    return (
      <>
        <Container fluid>
         <div className="row no-gutters">
          Welcome to CoAct; the portal for using the SDF.
          Your registration request is still pending and will be acted upon soon.
         </div>
         </Container>
      </>
    );
  }

  return (
    <>
      <Container fluid>
       <div className="row no-gutters">
        Welcome to CoAct; the portal for using the SDF.
        You don't seem to have an SDF account associated with your InCommon EPPN {props.eppn}.
        If you would like to request an account, please click here.
       </div>
       <button type="button" className="btn btn-primary" onClick={handleShow}>Request an SDF account</button>
       <ReqUserAccount show={show} setShow={setShow} eppn={props.eppn} requestUserAccount={requestAccount} />
       </Container>
    </>
  );
}
