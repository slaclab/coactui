import { useQuery, useMutation, useLazyQuery, gql } from "@apollo/client";
import _ from "lodash";
import React, { Component, useState } from 'react';
import { NavLink } from "react-router-dom";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Modal from 'react-bootstrap/Modal';
import ModalHeader from 'react-bootstrap/ModalHeader';
import ModalTitle from 'react-bootstrap/ModalTitle';
import ModalBody from 'react-bootstrap/ModalBody';
import ModalFooter from 'react-bootstrap/ModalFooter';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { SearchAndAdd } from "./widgets";
import { TeraBytes } from './widgets';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit } from '@fortawesome/free-solid-svg-icons'

const FACILITYDETAILS = gql`
query Facility($facilityinput: FacilityInput){
  facility(filter:$facilityinput) {
    name
    description
    czars
    serviceaccount
    servicegroup
    computepurchases {
      clustername
      purchased
      allocated
      used
    }
    storagepurchases {
      storagename
      purpose
      purchased
      allocated
      used
    }
  }
  whoami {
    username
    isAdmin
  }
  clusters {
    name
  }
  storagenames
  storagepurposes
}
`;

const USERNAMES = gql`
query users {
  users {
    username
  }
}`;

const USERFOREPPN = gql`
query getuserforeppn($eppn: String!) {
  getuserforeppn(eppn: $eppn) {
    username
  }
}`;

const USERMATCHINGUSERNAME = gql`
query usersMatchingUserName($regex: String!) {
  usersMatchingUserName(regex: $regex) {
    username
  }
}`;

const ADD_CZAR_MUTATION = gql`
mutation facilityAddCzar($facilityinput: FacilityInput!, $user: UserInput!) {
  facilityAddCzar(facility: $facilityinput, user: $user) {
    name
  }
}
`;

const REMOVE_CZAR_MUTATION = gql`
mutation facilityRemoveCzar($facilityinput: FacilityInput!, $user: UserInput!) {
  facilityRemoveCzar(facility: $facilityinput, user: $user) {
    name
  }
}
`;

const REQUEST_USERACCOUNT_MUTATION = gql`
mutation requestNewSDFAccount($request: CoactRequestInput!){
  requestNewSDFAccount(request: $request){
    Id
  }
}
`;

const ADDUPDT_COMPUTE_PURCHASE = gql`
mutation facilityAddUpdateComputePurchase($facilityinput: FacilityInput!, $clusterinput: ClusterInput!, $purchase: Float!) {
  facilityAddUpdateComputePurchase(facility: $facilityinput, cluster: $clusterinput, purchase: $purchase){
    Id
  }
}
`
const ADDUPDT_STORAGE_PURCHASE = gql`
mutation facilityAddUpdateStoragePurchase($facilityinput: FacilityInput!, $purpose: String!, $storagename: String, $purchase: Float!) {
  facilityAddUpdateStoragePurchase(facility: $facilityinput, purpose: $purpose, storagename: $storagename, purchase: $purchase){
    Id
  }
}
`



class AddComputePurchase extends Component {
  constructor(props) {
    super(props);
    this.state = { clustername: "", currentPurchase: props.currentpurchase, clusterInvalid: false }
    this.setPurchase = (event) => { this.setState({currentPurchase: event.target.value}) }
    this.setCluster = (event) => {
      let clustername = event.target.value;
      if (_.isEmpty(clustername)) {
        this.setState({clusterInvalid: true})
        return
      }
      this.setState({clustername: clustername, clusterInvalid: false})
    }
    this.validateAndApply = () => {
      if (_.isEmpty(this.state.clustername)) {
        this.setState({clusterInvalid: true})
        return
      }
      this.props.applyNewPurchase(this.state.clustername, this.state.currentPurchase);
    }
  }

  render() {
    let clusterswithoutpurchases = _.difference(_.map(this.props.clusters, "name"), _.map(this.props.facility.computepurchases, "clustername"));
    if(_.isEmpty(clusterswithoutpurchases)) {
      return (
        <Modal show={this.props.showModal} onHide={() => {this.props.setShowModal(false)}}>
          <ModalHeader closeButton={true}>
            <ModalTitle>This facility has purchased compute in all the existing clusters. Please edit the existing purchases.</ModalTitle>
          </ModalHeader>
          <ModalBody>
          </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Close
          </Button>
        </ModalFooter>
    </Modal>
      )
    }

    return (
      <Modal show={this.props.showModal} onHide={() => {this.props.setShowModal(false)}}>
        <ModalHeader closeButton={true}>
          <ModalTitle>Add a new compute purchase for the facility <b className="em">{this.props.facility.name}</b></ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Row>
            <InputGroup hasValidation>
                <Col md={3}><Form.Label className="px-2" >Cluster:</Form.Label></Col>
                <Col>
                  <Form.Control required as="select" type="select" onChange={this.setCluster} isInvalid={this.state.clusterInvalid}>
                  <option value="">Please select a cluster</option>
                  {
                    _.map(clusterswithoutpurchases, function(x){ return ( <option key={x} value={x}>{x}</option> ) })
                  }
                  </Form.Control>
                  <Form.Control.Feedback type="invalid">Please select a cluster</Form.Control.Feedback>
                </Col>
            </InputGroup>
          </Row>
          <Row>
            <Col md={2}><Form.Label className="px-2" >Purchase (in slachours):</Form.Label></Col>
            <Col>
              <InputGroup hasValidation>
              <Form.Control type="number" onBlur={this.setPurchase} isInvalid={this.props.isError} defaultValue={this.props.currentpurchase}/>
              <Form.Control.Feedback type="invalid">{this.props.errorMessage}</Form.Control.Feedback>
          </InputGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Close
          </Button>
          <Button onClick={() => { this.validateAndApply() }}>
            Done
          </Button>
        </ModalFooter>
    </Modal>
    );
  }
}

class UpdateComputePurchase extends Component {
  constructor(props) {
    super(props);
    this.state = { currentPurchase: props.currentpurchase }
    this.setPurchase = (event) => { this.setState({currentPurchase: event.target.value}) }
  }

  render() {
    return (
      <Modal show={this.props.showModal} onHide={() => {this.props.setShowModal(false)}}>
        <ModalHeader closeButton={true}>
          <ModalTitle>Update the compute purchase for the facility <b className="em">{this.props.facility.name}</b> on the cluster <b className="em">{this.props.clustername}</b></ModalTitle>
        </ModalHeader>
        <ModalBody>
          <InputGroup hasValidation>
            <Form.Control type="number" onBlur={this.setPurchase} isInvalid={this.props.isError} defaultValue={this.props.currentpurchase}/>
            <Form.Control.Feedback type="invalid">{this.props.errorMessage}</Form.Control.Feedback>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Close
          </Button>
          <Button onClick={() => { this.props.applyNewPurchase(this.props.clustername, this.state.currentPurchase) }}>
            Done
          </Button>
        </ModalFooter>
    </Modal>
    );
  }
}

class FacilityComputePurchases extends Component {
  constructor(props) {
    super(props);
    this.state = { showAddModal: false, showUpdateModal: false, updateModalClusterName: "", updateModalCurrentPurchase: 0, modalError: false, modalErrorMessage: ""};
    this.applyNewPurchase = (clustername, newPurchase) => {
      this.props.addUpdateComputePurchase(clustername, newPurchase, () => {this.setState({showAddModal: false, showUpdateModal: false})}, (message) => { this.setState({modalError: true, modalErrorMessage: message})})
    }
  }

  render() {
    return (
      <Col>
        <Card className="facrsc">
          <Card.Header>Compute {this.props.isAdmin ? (<span className="px-1 text-warning" title="Add new compute purchase" onClick={() => { this.setState({showAddModal: true, modalError: false, modalErrorMessage: ""})}}><FontAwesomeIcon icon={faPlus}/></span>) : (<span></span>)}</Card.Header>
          <Card.Body>
            <Row className="mb-2">
              <Col md={3}><span className="tbllbl">Cluster</span></Col>
              <Col md={3}><span className="tbllbl">Acquired</span></Col>
              <Col md={3}><span className="tbllbl">Allocated</span></Col>
              <Col md={3}><span className="tbllbl">Used</span></Col>
            </Row>
            {
              _.map(_.sortBy(this.props.facility.computepurchases, "clustername"), (p) => { return (
                <Row key={p.clustername} className="mb-2">
                  <Col md={3}><NavLink to={"/clusterusage/"+p.clustername} key={p.clustername}>{p.clustername}</NavLink></Col>
                  <Col md={3}>{p.purchased} {this.props.isAdmin ? (<span className="px-1 text-warning" title="Edit purchased amount" onClick={() => { this.setState({showUpdateModal: true, updateModalClusterName: p.clustername, updateModalCurrentPurchase: p.purchased, modalError: false, modalErrorMessage: ""})}}><FontAwesomeIcon icon={faEdit}/></span>) : (<span></span>)}</Col>
                  <Col md={3}>{p.allocated}</Col>
                  <Col md={3}>{p.used.toFixed(2)}</Col>
                </Row>

              ) })
            }
          </Card.Body>
        </Card>
        <AddComputePurchase facility={this.props.facility} clusters={this.props.clusters} showModal={this.state.showAddModal} setShowModal={(val) => { this.setState({showAddModal: val})}} isError={this.state.modalError} errorMessage={this.state.modalErrorMessage} applyNewPurchase={this.applyNewPurchase} />
        <UpdateComputePurchase facility={this.props.facility} showModal={this.state.showUpdateModal} setShowModal={(val) => { this.setState({showUpdateModal: val})}} clustername={this.state.updateModalClusterName} currentpurchase={this.state.updateModalCurrentPurchase} isError={this.state.modalError} errorMessage={this.state.modalErrorMessage} applyNewPurchase={this.applyNewPurchase}/>
      </Col>
    )
  }
}


class AddStoragePurchase extends Component {
  constructor(props) {
    super(props);
    this.state = { purpose: "", storagename: "", currentPurchase: props.currentpurchase, purposeInvalid: false, storagenameInvalid: false }
    this.setPurchase = (event) => { this.setState({currentPurchase: event.target.value}) }
    this.setPurpose = (event) => {
      let purpose = event.target.value;
      if (_.isEmpty(purpose)) {
        this.setState({purposeInvalid: true})
        return
      }
      this.setState({purpose: purpose, purposeInvalid: false})
    }
    this.setStorageName = (event) => {
      let storagename = event.target.value;
      if (_.isEmpty(storagename)) {
        this.setState({storagenameInvalid: true})
        return
      }
      this.setState({storagename: storagename, storagenameInvalid: false})
    }

    this.validateAndApply = () => {
      if (_.isEmpty(this.state.purpose)) {
        this.setState({purposeInvalid: true})
        return
      }
      if (_.isEmpty(this.state.storagename)) {
        this.setState({storagenameInvalid: true})
        return
      }
      this.props.applyNewPurchase(this.state.purpose, this.state.storagename, this.state.currentPurchase);
    }

  }

  render() {
    let purposewithoutpurchase = _.difference(this.props.storagepurposes, _.map(this.props.facility.storagepurchases, "purpose"));
    if(_.isEmpty(purposewithoutpurchase)) {
      return (
        <Modal show={this.props.showModal} onHide={() => {this.props.setShowModal(false)}}>
          <ModalHeader closeButton={true}>
            <ModalTitle>This facility has purchased storage for all purposes. Please edit the existing purchases.</ModalTitle>
          </ModalHeader>
          <ModalBody>
          </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Close
          </Button>
        </ModalFooter>
    </Modal>
      )
    }
    return (
      <Modal show={this.props.showModal} onHide={() => {this.props.setShowModal(false)}}>
        <ModalHeader closeButton={true}>
          <ModalTitle>Add a new storage purchase for the facility <b className="em">{this.props.facility.name}</b></ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Row>
            <InputGroup hasValidation>
                <Col md={3}><Form.Label className="px-2" >Purpose:</Form.Label></Col>
                <Col>
                  <Form.Control required as="select" type="select" onChange={this.setPurpose} isInvalid={this.state.purposeInvalid}>
                  <option value="">Please select a purpose for this storage</option>
                  {
                    _.map(purposewithoutpurchase, function(x){ return ( <option key={x} value={x}>{x}</option> ) })
                  }
                  </Form.Control>
                  <Form.Control.Feedback type="invalid">Please select a purpose</Form.Control.Feedback>
                </Col>
            </InputGroup>
            <InputGroup hasValidation>
                <Col md={3}><Form.Label className="px-2" >On storage:</Form.Label></Col>
                <Col>
                  <Form.Control required as="select" type="select" onChange={this.setStorageName} isInvalid={this.state.storagenameInvalid}>
                  <option value="">Please select a storage</option>
                  {
                    _.map(this.props.storagenames, function(x){ return ( <option key={x} value={x}>{x}</option> ) })
                  }
                  </Form.Control>
                  <Form.Control.Feedback type="invalid">Please select a storage</Form.Control.Feedback>
                </Col>
            </InputGroup>
          </Row>
          <Row>
            <Col md={2}><Form.Label className="px-2" >Purchase (in Terabytes):</Form.Label></Col>
            <Col>
              <InputGroup hasValidation>
              <Form.Control type="number" onBlur={this.setPurchase} isInvalid={this.props.isError} defaultValue={this.props.currentpurchase}/>
              <Form.Control.Feedback type="invalid">{this.props.errorMessage}</Form.Control.Feedback>
          </InputGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Close
          </Button>
          <Button onClick={() => { this.validateAndApply() }}>
            Done
          </Button>
        </ModalFooter>
    </Modal>
    );
  }
}


class UpdateStoragePurchase extends Component {
  constructor(props) {
    super(props);
    this.state = { currentPurchase: props.currentpurchase }
    this.setPurchase = (event) => { this.setState({currentPurchase: event.target.value}) }
  }

  render() {
    return (
      <Modal show={this.props.showModal} onHide={() => {this.props.setShowModal(false)}}>
        <ModalHeader closeButton={true}>
          <ModalTitle>Update the storage purchase for the facility <b className="em">{this.props.facility.name}</b> for the purpose <b className="em">{this.props.purpose}</b></ModalTitle>
        </ModalHeader>
        <ModalBody>
          <InputGroup hasValidation>
            <Form.Control type="number" onBlur={this.setPurchase} isInvalid={this.props.isError} defaultValue={(this.props.currentpurchase/1000.0).toFixed(2)}/>
            <Form.Control.Feedback type="invalid">{this.props.errorMessage}</Form.Control.Feedback>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Close
          </Button>
          <Button onClick={() => { this.props.applyNewPurchase(this.props.purpose, this.props.storagename, this.state.currentPurchase) }}>
            Done
          </Button>
        </ModalFooter>
    </Modal>
    );
  }
}


class FacilityStoragePurchases extends Component {
  constructor(props) {
    super(props);
    this.state = { showAddModal: false, showUpdateModal: false, updateModalPurpose: "", updateModalStorageName: "", updateModalCurrentPurchase: 0, modalError: false, modalErrorMessage: ""};
    this.applyNewPurchase = (purpose, storagename, newPurchase) => {
      this.props.addUpdateStoragePurchase(purpose, storagename, newPurchase, () => {this.setState({showAddModal: false, showUpdateModal: false})}, (message) => { this.setState({modalError: true, modalErrorMessage: message})})
    }
  }

  render() {
    return (
      <Col>
        <Card className="facrsc">
          <Card.Header>Storage {this.props.isAdmin ? (<span className="px-1 text-warning" title="Add new compute purchase" onClick={() => { this.setState({showAddModal: true, modalError: false, modalErrorMessage: ""})}}><FontAwesomeIcon icon={faPlus}/></span>) : (<span></span>)}</Card.Header>
          <Card.Body>
            <Row className="mb-2">
              <Col md={3}><span className="tbllbl">Storage Class</span></Col>
              <Col md={3}><span className="tbllbl">Purpose</span></Col>
              <Col md={2}><span className="tbllbl">Acquired (TB)</span></Col>
              <Col md={2}><span className="tbllbl">Allocated (TB)</span></Col>
              <Col md={2}><span className="tbllbl">Used (TB)</span></Col>
            </Row>
            {
              _.map(_.sortBy(this.props.facility.storagepurchases, "purpose"), (p) => { return (
                <Row key={p.storagename+p.purpose} className="mb-2">
                  <Col md={3}><NavLink to={"/storageusage/"+p.storagename} key={p.storagename}>{p.storagename}</NavLink></Col>
                  <Col md={3}><NavLink to={"/storageusage/"+p.storagename+"/purpose/"+p.purpose} key={p.storagename+p.purpose}>{p.purpose}</NavLink></Col>
                  <Col md={2}><TeraBytes value={p.purchased}/> {this.props.isAdmin ? (<span className="px-1 text-warning" title="Edit purchased storage" onClick={() => { this.setState({showUpdateModal: true, updateModalPurpose: p.purpose, updateModalStorageName: p.storagename, updateModalCurrentPurchase: p.purchased, modalError: false, modalErrorMessage: ""})}}><FontAwesomeIcon icon={faEdit}/></span>) : (<span></span>)}</Col>
                  <Col md={2}><TeraBytes value={p.allocated}/></Col>
                  <Col md={2}><TeraBytes value={p.used}/></Col>
                </Row>

              ) })
            }
          </Card.Body>
        </Card>
        <AddStoragePurchase facility={this.props.facility} storagenames={this.props.storagenames} storagepurposes = {this.props.storagepurposes} showModal={this.state.showAddModal} setShowModal={(val) => { this.setState({showAddModal: val})}} isError={this.state.modalError} errorMessage={this.state.modalErrorMessage} applyNewPurchase={this.applyNewPurchase}/>
        <UpdateStoragePurchase facility={this.props.facility} showModal={this.state.showUpdateModal} setShowModal={(val) => { this.setState({showUpdateModal: val})}} purpose={this.state.updateModalPurpose} storagename={this.state.updateModalStorageName} currentpurchase={this.state.updateModalCurrentPurchase} isError={this.state.modalError} errorMessage={this.state.modalErrorMessage} applyNewPurchase={this.applyNewPurchase}/>
      </Col>
    )
  }
}


class RegisterNewUser extends Component {
  constructor(props) {
    super(props);
    this.state = { registrationmessage : "Please enter a valid email", eppn: "", eppnInvalid: false, eppnInvalidMsg: "" };
    this.usernames = [];
    this.validate = () => {
      const validations = [];
      validations.push(new Promise(resolve => {
        if(_.isEmpty(this.state.eppn)) {
          this.setState({ eppnInvalid: true, eppnInvalidMsg: "Please enter a valid email address"}, () => { resolve(false); return; })
        } else {
          resolve(true);
          return;
        }
      }));
      validations.push(new Promise(resolve => {
        const validateEmail = (email) => {
          return email.match(
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          );
        };
        if(!validateEmail(this.state.eppn)) {
          this.setState({ eppnInvalid: true, eppnInvalidMsg: "Please enter a valid email address"}, () => { resolve(false); return; })
        } else {
          resolve(true);
          return;
        }
      }));
      return Promise.all(validations);
    }
    
    this.setEppn = (event) => { 
      this.setState({ eppn: event.target.value, eppnInvalid: false, eppnInvalidMsg: ""}, this.validate)
    }
    this.closeModal = () => {
      this.setState({ eppn: "", eppnInvalid: false, eppnInvalidMsg: ""});
      this.props.setShowModal(false) 
    }
    this.setError = (error) => { console.log("Error!!!!!!"); console.log(error.message); this.setState({ eppnInvalid: true, eppnInvalidMsg: error.message })}
    this.registerUser = () => {
      this.validate().then((data) =>{
        console.log(data);
        if(this.state.eppnInvalid) { console.log("Still some errors; please process"); return; }
        this.props.requestUserAccount(this.state.eppn, this.closeModal, this.setError );
      })
    }
  }

  render() {
    return (
      <Modal show={this.props.showModal} onHide={this.closeModal} >
        <ModalHeader closeButton={true}>
          <ModalTitle>Register an new S3DF account</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form.Text>{this.state.registrationmessage}</Form.Text>
          <InputGroup hasValidation>
            <Form.Control type="email" placeholder="Username" onBlur={this.setEppn} isInvalid={this.state.eppnInvalid} defaultValue="@slac.stanford.edu"/>
            <Form.Control.Feedback type="invalid">{this.state.eppnInvalidMsg}</Form.Control.Feedback>
          </InputGroup>


        </ModalBody>
        <ModalFooter>
          <Button onClick={this.closeModal}>Close</Button>
          <Button onClick={this.registerUser}>Register</Button>
        </ModalFooter>
    </Modal>
    );
  }
}


class AddRemoveCzar extends Component {
  constructor(props) {
    super(props);
    this.getusernamematches = (srchtxt, onCompleted) => {
      this.props.getUsersMatchingUserName({
        variables: { regex: srchtxt},
        onCompleted: (data) => {
          let matches = _.map(_.get(data, "usersMatchingUserName", []), "username");
          onCompleted(matches);
        }
      })
    }
  }

  render() {
    return (
      <Modal show={this.props.showModal} onHide={() => {this.props.setShowModal(false)}}>
        <ModalHeader closeButton={true}>
          <ModalTitle>Search for users and add/remove them to/from as czars for this facility.</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <SearchAndAdd label="Username" getmatches={this.getusernamematches} selected={this.props.facility.czars} onSelDesel={this.props.onSelDesel}/>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Done
          </Button>
        </ModalFooter>
    </Modal>
    );
  }
}


class FacilityDetails extends Component {
  constructor(props) {
    super(props);
    this.state = { showCzarModal: false, showRegisterUserModal: false }
  }

  render() {
    return (
      <Container fluid>
        <Row>
          <Col>
            <Card>
              <Card.Header>Details</Card.Header>
              <Card.Body>
                <Row>
                  <Col md={9}>
                    <Row><Col md={3}><span className="tbllbl">Name</span></Col><Col>{this.props.facility.name}</Col></Row>
                    <Row><Col md={3}><span className="tbllbl">Description</span></Col><Col>{this.props.facility.description}</Col></Row>
                  </Col>
                  <Col md={3}>
                    <Button variant="secondary" onClick={() => { this.setState({showRegisterUserModal: true})}}>Register new users</Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card>
              <Card.Header>Czars</Card.Header>
              <Card.Body>
                <Row><Col md={8}><ul className="ps-5">
                {
                  _.map(this.props.facility.czars, (z) => { return (<li key={z}>{z}</li>) })
                }
                </ul></Col><Col><Button variant="secondary" onClick={() => { this.setState({showCzarModal: true})}}>Add/Remove Czars</Button></Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card>
              <Card.Header>Service Accounts</Card.Header>
              <Card.Body>
                <Row><Col md={3}><span className="tbllbl">User</span></Col><Col md={5}>{_.get(this.props.facility, "serviceaccount")}</Col></Row>
                <Row><Col md={3}><span className="tbllbl">Group</span></Col><Col md={5}>{_.get(this.props.facility, "servicegroup")}</Col></Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        <Row>
          <FacilityComputePurchases facility={this.props.facility} clusters={this.props.clusters} isAdmin={this.props.isAdmin} addUpdateComputePurchase={this.props.addUpdateComputePurchase}/>
          <FacilityStoragePurchases facility={this.props.facility} storagenames={this.props.storagenames} storagepurposes={this.props.storagepurposes} isAdmin={this.props.isAdmin} addUpdateStoragePurchase={this.props.addUpdateStoragePurchase} />
          <AddRemoveCzar facility={this.props.facility} getUsersMatchingUserName={this.props.getUsersMatchingUserName} onSelDesel={this.props.onSelDesel} showModal={this.state.showCzarModal} setShowModal={(val) => { this.setState({showCzarModal: val})} }/>
          <RegisterNewUser facility={this.props.facility} getUsersMatchingUserName={this.props.getUsersMatchingUserName} getUserForEPPN={this.props.getUserForEPPN} showModal={this.state.showRegisterUserModal} setShowModal={(val) => { this.setState({showRegisterUserModal: val})} } requestUserAccount={this.props.requestUserAccount }/>
        </Row>
      </Container>
    )
  }
}

class RequestNewFacility extends Component {
  render() {
    return <Button variant="secondary">Request New Facility</Button>
  }
}

export default function Facility(props) {
  //let params = useParams(), facilityname = params.facilityname;
  const { loading, error, data } = useQuery(FACILITYDETAILS, { variables: { facilityinput: { name: props.facilityname }}},  { errorPolicy: 'all'} );
  const [ getUsersMatchingUserName ] = useLazyQuery(USERMATCHINGUSERNAME);
  const [ getUserForEPPN ] = useLazyQuery(USERFOREPPN);
  const [ addCzarMutation ] = useMutation(ADD_CZAR_MUTATION);
  const [ removeCzarMutation ] = useMutation(REMOVE_CZAR_MUTATION);
  const [ requestUserAccount ] = useMutation(REQUEST_USERACCOUNT_MUTATION);
  const [ addUpdtComputePurchase ] = useMutation(ADDUPDT_COMPUTE_PURCHASE);
  const [ addUpdtStoragePurchase ] = useMutation(ADDUPDT_STORAGE_PURCHASE);


  let addRemoveCzar = function(username, selected) {
    if(selected) {
      console.log("Adding user " + username + " as a czar to facility " + facility);
      addCzarMutation({ variables: { facilityinput: { name: props.facilityname }, user: { username: username } }, refetchQueries: [ FACILITYDETAILS, 'Facility' ], onError: (error) => { console.log("Error when adding czar " + error); } });
    } else {
      console.log("Removing user " + username + " as a czar from facility " + facility);
      removeCzarMutation({ variables: { facilityinput: { name: props.facilityname }, user: { username: username } }, refetchQueries: [ FACILITYDETAILS, 'Facility' ], onError: (error) => { console.log("Error when removing czar " + error); } });
    }
  }

  const requestAccount = (eppn, callWhenDone, onError) => {
    const username = eppn.split("@")[0];
    console.log("Account requested for eppn " + eppn + " in facility "  + props.facilityname + " with preferred username " + username);
    requestUserAccount({ variables: { request: { reqtype: "UserAccount", eppn: eppn, preferredUserName: username, "facilityname": props.facilityname, "approvalstatus": "PreApproved"}}, 
      onCompleted: (data) => { console.log(data); callWhenDone(data)},
      onError: (error) => { console.log(error); onError(error)}
    }).catch(err => { console.log(err); onError(err)});
  };

  let addUpdateComputePurchase = function(clustername, newPurchase, callWhenDone, onError) {
    console.log("Updating compute for " + clustername + " to " + newPurchase);
    addUpdtComputePurchase({ 
      variables: { facilityinput: { name: props.facilityname }, clusterinput: { name: clustername }, purchase: _.toNumber(newPurchase) }, 
      refetchQueries: [ FACILITYDETAILS, 'Facility' ], 
      onCompleted: (data) => { callWhenDone(data)},
      onError: (error) => { console.log(error); onError(error.message) } })
  }

  let addUpdateStoragePurchase = function(purpose, storagename, newPurchase, callWhenDone, onError) {
    console.log("Updating storage for " + purpose + " to " + newPurchase + " on " + storagename);
    addUpdtStoragePurchase({ 
      variables: { facilityinput: { name: props.facilityname }, purpose: purpose, storagename: storagename, purchase: _.toNumber(newPurchase)*1000.0 }, 
      refetchQueries: [ FACILITYDETAILS, 'Facility' ], 
      onCompleted: (data) => { callWhenDone(data)},
      onError: (error) => { console.log(error); onError(error.message) } })
  }


  if (loading) return <p>Loading...</p>;
//  if (error) return <p>Error :</p>;

  console.log(data);
  let facility = data.facility;
  let isAdmin = data.whoami.isAdmin;
  let clusters = data.clusters;
  let storagenames = data.storagenames;
  let storagepurposes = data.storagepurposes;

  return (<div>
    <FacilityDetails facility={facility} isAdmin={isAdmin} getUserForEPPN={getUserForEPPN} clusters={clusters} storagenames={storagenames} storagepurposes={storagepurposes}
    onSelDesel={addRemoveCzar} requestUserAccount={requestAccount} getUsersMatchingUserName={getUsersMatchingUserName}
    addUpdateComputePurchase={addUpdateComputePurchase} addUpdateStoragePurchase={addUpdateStoragePurchase}/>
  </div>);
}
