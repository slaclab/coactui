import React, { useState } from "react";
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { useMutation, gql } from "@apollo/client";

const REQUEST_USERACCOUNT_MUTATION = gql`
mutation newSDFAccountRequest($request: SDFRequestInput!){
  newSDFAccountRequest(request: $request){
    Id
  }
}
`;


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
       <Modal show={show} onHide={handleClose}>
         <Modal.Header closeButton>
           <Modal.Title>Request an SDF account</Modal.Title>
         </Modal.Header>
         <Modal.Body>Request an SDF account for {props.eppn}</Modal.Body>
         <Modal.Footer>
           <Button variant="secondary" onClick={handleClose}>
             Close
           </Button>
           <Button variant="primary" onClick={requestAccount}>
             Request Account
           </Button>
         </Modal.Footer>
         </Modal>
       </Container>
    </>
  );
}
