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
    }
    storagepurchases {
      storagename
      purpose
      purchased
      allocated
      used
    }
  }
	pastHour:facilityRecentComputeUsage(pastMinutes: 60, skipQoses: "preemptable") {
    clustername
    facility
    percentUsed
    resourceHours
  }  
  pastDay:facilityRecentComputeUsage(pastMinutes: 1440, skipQoses: "preemptable") {
    clustername
    facility
    percentUsed
    resourceHours
  }  
  pastWeek:facilityRecentComputeUsage(pastMinutes: 10080, skipQoses: "preemptable") {
    clustername
    facility
    percentUsed
    resourceHours
  }  
  whoami {
    username
    isAdmin
  }
  clusters {
    name
    nodecpucount
    nodecpucountdivisor
    chargefactor
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

const USER_LOOKUP_BY_USERNAME = gql`
query userlookup($username: String!) {
  usersLookupFromService(filter: {username: $username}) {
    username
    fullname
    preferredemail
  }
}
`
const USER_LOOKUP_BY_FULLNAME = gql`
query userlookup($fullname: String!) {
  usersLookupFromService(filter: {fullname: $fullname}) {
    username
    fullname
    preferredemail
  }
}
`
const USER_LOOKUP_BY_PREFERRED_EMAIL = gql`
query userlookup($preferredemail: String!) {
  usersLookupFromService(filter: {preferredemail: $preferredemail}) {
    username
    fullname
    preferredemail
  }
}
`

const UPDATE_FACILITY_DESC = gql`
mutation facilityUpdateDescription($facilityinput: FacilityInput!, $newdescription: String!) {
  facilityUpdateDescription(facility: $facilityinput, newdescription: $newdescription){
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
              <InputGroup.Text>Cluster:</InputGroup.Text>
              <Form.Control required as="select" type="select" onChange={this.setCluster} isInvalid={this.state.clusterInvalid}>
                <option value="">Please select a cluster</option>
                { _.map(clusterswithoutpurchases, function(x){ return ( <option key={x} value={x}>{x}</option> ) }) }
              </Form.Control>
              <Form.Control.Feedback type="invalid">Please select a cluster</Form.Control.Feedback>
            </InputGroup>
          </Row>
          <Row>
            <InputGroup hasValidation>
              <InputGroup.Text>Purchase (in servers):</InputGroup.Text>
              <Form.Control type="number" onBlur={this.setPurchase} isInvalid={this.props.isError} defaultValue={this.props.currentpurchase}/>
              <Form.Control.Feedback type="invalid">{this.props.errorMessage}</Form.Control.Feedback>
            </InputGroup>
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
            <InputGroup.Text>Purchase (in servers):</InputGroup.Text>
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

function ComputeUsage(props) {
  const { periodname, recentusagebycluster, facilityname, clustername } = props;
  let usage = _.find(_.get(recentusagebycluster, periodname), {facility: facilityname, clustername: clustername}) ?? { percentUsed: 0, resourceHours: 0 };
  return (<span title={usage.resourceHours + " resource hours"}>{usage.percentUsed.toFixed(2) + "%"}</span>)
}

class FacilityComputePurchases extends Component {
  constructor(props) {
    super(props);
    this.state = { showAddModal: false, showUpdateModal: false, updateModalClusterName: "", updateModalCurrentPurchase: 0, modalError: false, modalErrorMessage: ""};
    this.applyNewPurchase = (clustername, newPurchase) => {
      this.props.addUpdateComputePurchase(clustername, newPurchase, () => {this.setState({showAddModal: false, showUpdateModal: false})}, (message) => { this.setState({modalError: true, modalErrorMessage: message})})
    }
    this.clusterInfos = _.keyBy(this.props.clusters, "name");
  }

  render() {
    return (
      <Col>
        <Card className="facrsc">
          <Card.Header>Compute {this.props.isAdmin ? (<span className="px-1 text-warning" title="Add new compute purchase" onClick={() => { this.setState({showAddModal: true, modalError: false, modalErrorMessage: ""})}}><FontAwesomeIcon icon={faPlus}/></span>) : (<span></span>)}</Card.Header>
          <Card.Body className="pt-0">
            <Row className="hdr">
              <Col md={6}><span className="tbllbl"></span></Col>
              <Col md={6} className="text-center"><span className="tbllbl">% Used</span></Col>
            </Row>
            <Row className="hdr py-2">
              <Col md={2}><span className="tbllbl">Cluster</span></Col>
              <Col md={2}><span className="tbllbl" title="Number of nodes">Acquired nodes</span></Col>
              <Col md={2} className="text-end"><span className="tbllbl">Total allocated (%)</span></Col>
              <Col md={2} className="text-end"><span className="tbllbl">Past hour</span></Col>
              <Col md={2} className="text-end"><span className="tbllbl">Past day</span></Col>
              <Col md={2} className="text-end"><span className="tbllbl">Past week</span></Col>
            </Row>
            {
              _.map(_.sortBy(this.props.facility.computepurchases, "clustername"), (p) => { 
                let clusterinfo = this.clusterInfos[p.clustername];
                // console.log(_.get(_.find(_.get(this.props.recentusagebycluster, "pastHour"), {facility: this.props.facility.name, clustername: p.clustername}), "percent"));
                console.log(this.props.recentusagebycluster);
                return (
                <Row key={p.clustername} className="py-2 text-end">
                  <Col md={2} className="text-start"><NavLink to={"/clusterusage/"+p.clustername} key={p.clustername}>{p.clustername}</NavLink></Col>
                  <Col md={2}>{p.purchased} {this.props.isAdmin ? (<span className="px-1 text-warning" title="Edit purchased amount" onClick={() => { this.setState({showUpdateModal: true, updateModalClusterName: p.clustername, updateModalCurrentPurchase: p.purchased, modalError: false, modalErrorMessage: ""})}}><FontAwesomeIcon icon={faEdit}/></span>) : (<span></span>)}</Col>
                  <Col md={2}>{p.allocated}</Col>
                  <Col md={2} className="text-end"><ComputeUsage periodname={"pastHour"} recentusagebycluster={this.props.recentusagebycluster} facilityname={this.props.facility.name} clustername={p.clustername}/></Col>
                  <Col md={2} className="text-end"><ComputeUsage periodname={"pastDay"} recentusagebycluster={this.props.recentusagebycluster} facilityname={this.props.facility.name} clustername={p.clustername}/></Col>
                  <Col md={2} className="text-end"><ComputeUsage periodname={"pastWeek"} recentusagebycluster={this.props.recentusagebycluster} facilityname={this.props.facility.name} clustername={p.clustername}/></Col>
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
          <Card.Body className="pt-0">
            <Row className="hdr">
              <Col md={6}><span className="tbllbl"></span></Col>
              <Col md={6} className="text-center"><span className="tbllbl">In TB</span></Col>
            </Row>
            <Row className="hdr py-2">
              <Col md={3}><span className="tbllbl">Storage Class</span></Col>
              <Col md={3}><span className="tbllbl">Purpose</span></Col>
              <Col md={2} className="text-end"><span className="tbllbl">Acquired</span></Col>
              <Col md={2} className="text-end"><span className="tbllbl">Allocated</span></Col>
              <Col md={2} className="text-end"><span className="tbllbl">Used</span></Col>
            </Row>
            {
              _.map(_.sortBy(this.props.facility.storagepurchases, "purpose"), (p) => { return (
                <Row key={p.storagename+p.purpose} className="py-2">
                  <Col md={3}><NavLink to={"/storageusage/"+p.storagename} key={p.storagename}>{p.storagename}</NavLink></Col>
                  <Col md={3}><NavLink to={"/storageusage/"+p.storagename+"/purpose/"+p.purpose} key={p.storagename+p.purpose}>{p.purpose}</NavLink></Col>
                  <Col md={2} className="text-end"><TeraBytes value={p.purchased}/> {this.props.isAdmin ? (<span className="px-1 text-warning" title="Edit purchased storage" onClick={() => { this.setState({showUpdateModal: true, updateModalPurpose: p.purpose, updateModalStorageName: p.storagename, updateModalCurrentPurchase: p.purchased, modalError: false, modalErrorMessage: ""})}}><FontAwesomeIcon icon={faEdit}/></span>) : (<span></span>)}</Col>
                  <Col md={2} className="text-end"><TeraBytes value={p.allocated}/></Col>
                  <Col md={2} className="text-end"><TeraBytes value={p.used}/></Col>
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
    this.state = {searchstring: "", selected: [], matches: [], showregister: false, errormsg: "" };
    this.usernames = [];

    this.setSearchString = (event) => { 
      this.setState({ searchstring: event.target.value, showregister: false, matches: [], selected: []})
    }
    this.closeModal = () => {
      this.setState({searchstring: "", selected: [], matches: [], showregister: false, errormsg: "" })
      this.props.setShowModal(false) 
    }
    this.setError = (errmsg) => { 
      this.setState({errormsg: errmsg})
    }
    this.registerUser = () => {
      let ubynm = _.keyBy(this.state.matches, "username");
      _.each(this.state.selected, (sel) => { 
        let user = ubynm[sel];
        this.props.requestUserAccount(user, this.closeModal, this.setError );
      })
    }
    this.lookupUser = () => { 
      let mergeInMatches = (matches) => {
        let uniqmatches = _.uniqBy(_.concat(matches, this.state.matches), (x) => { return x["username"]})
        this.setState({matches: uniqmatches});
      }
      this.props.userLookupByUserName({
        variables: { username: this.state.searchstring },
        onCompleted: (data) => {
          mergeInMatches(_.get(data, "usersLookupFromService", []));
        }
      })
      this.props.userLookupByFullName({
        variables: { fullname: this.state.searchstring },
        onCompleted: (data) => {
          mergeInMatches(_.get(data, "usersLookupFromService", []));
        }
      })
      this.props.userLookupByPreferredEmail({
        variables: { preferredemail: this.state.searchstring },
        onCompleted: (data) => {
          mergeInMatches(_.get(data, "usersLookupFromService", []));
        }
      });
    }
    this.checkUncheck = (event, username) => { 
      this.setState((currstate) => { 
        let newstate = _.clone(currstate);
        if(event.target.checked) {
          newstate.selected = _.concat(this.state.selected, username);
        } else {
          newstate.selected = _.without(this.state.selected, username);
        }
        newstate.showregister = newstate.selected.length > 0;
        return newstate;
      })
    }
  }

  render() {
    return (
      <Modal size="lg" show={this.props.showModal} onHide={this.closeModal} >
        <ModalHeader closeButton={true}>
          <ModalTitle>Invite users to the {this.props.facility.name} facility</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form.Text>Search for users by their name, their userid or their preferred email; hit tab to lookup</Form.Text>
          <Form.Label className="text-danger">{this.state.errormsg}</Form.Label>
          <InputGroup hasValidation>
            <Form.Control type="email" placeholder="Name or userid" onChange={this.setSearchString} onBlur={this.lookupUser}/>
          </InputGroup>
          <table className="table table-condensed table-striped table-bordered mt-2 pt-2">
            <thead><tr><th>UserId</th><th>Name</th><th>Preferred email</th><th></th></tr></thead>
            <tbody>{ _.map(this.state.matches, (u) => { return (<tr key={u.username}><td>{u.username}</td><td>{u.fullname}</td><td>{u.preferredemail}</td><td><input type="checkbox" data-selkey={u.username} onChange={(ev) => this.checkUncheck(ev, u.username)}/></td></tr>) }) }</tbody>
          </table>
        </ModalBody>
        <ModalFooter>
          <Button className="btn-secondary" onClick={this.closeModal}>Close</Button>
          <Button className={!this.state.showregister ? "" : "d-none"} onClick={this.lookupUser}>Lookup</Button>
          <Button className={this.state.showregister ? "" : "d-none"}  onClick={this.registerUser}>Register</Button>
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


class EditDescriptionModal extends Component {
  constructor(props) {
    super(props);
    this.state = {description: "", modalError: false, modalErrorMessage: ""};
    this.setDescription = (event) => { this.setState({description: event.target.value, modalError: false, modalErrorMessage: ""})}
    this.changeDescription = (event) => { 
      this.props.updateFacilityDesc(
        this.state.description, 
        () => {props.setShowModal(false)},
        (message) => { this.setState({modalError: true, modalErrorMessage: message})}
      )
    }
  }

  componentDidMount() {
    this.setState({description: this.props.facility.description, modalError: false, modalErrorMessage: ""});
  }


  render() {
    return (
      <Modal show={this.props.showModal} onHide={() => {this.props.setShowModal(false)}}>
        <ModalHeader closeButton={true}>
          <ModalTitle>Edit the description for facility {this.props.facility.name}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form>
            <Form.Group hasValidation>
              <Form.Label>Description:</Form.Label>
              <Form.Control as="textarea" rows={3} isInvalid={this.state.modalError} onChange={this.setDescription} defaultValue={this.props.facility.description}></Form.Control>
              <Form.Control.Feedback type="invalid">{this.state.modalErrorMessage}</Form.Control.Feedback>
            </Form.Group>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => {this.props.setShowModal(false)}}>
            Close
          </Button>
          <Button onClick={() => {this.changeDescription()}}>
            Change
          </Button>
        </ModalFooter>
      </Modal>
    )
  }
}


class FacilityDetails extends Component {
  constructor(props) {
    super(props);
    this.state = { showCzarModal: false, showRegisterUserModal: false, showEditDescModal: false }
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
                    <Row><Col md={4}><span className="tbllbl">Name</span></Col><Col>{this.props.facility.name}</Col></Row>
                    <Row><Col md={4}>
                      <span className="tbllbl">Description
                        <span className="ps-1 text-warning" title="Edit description" onClick={() => this.setState({showEditDescModal : true})}><FontAwesomeIcon icon={faEdit}/></span>
                      </span></Col>
                      <Col><span>{this.props.facility.description}</span></Col>
                    </Row>
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
          <FacilityComputePurchases facility={this.props.facility} clusters={this.props.clusters} isAdmin={this.props.isAdmin} addUpdateComputePurchase={this.props.addUpdateComputePurchase} recentusagebycluster={this.props.recentusagebycluster}/>
          <FacilityStoragePurchases facility={this.props.facility} storagenames={this.props.storagenames} storagepurposes={this.props.storagepurposes} isAdmin={this.props.isAdmin} addUpdateStoragePurchase={this.props.addUpdateStoragePurchase} />
          <AddRemoveCzar facility={this.props.facility} getUsersMatchingUserName={this.props.getUsersMatchingUserName} onSelDesel={this.props.onSelDesel} showModal={this.state.showCzarModal} setShowModal={(val) => { this.setState({showCzarModal: val})} }/>
          <RegisterNewUser facility={this.props.facility} getUsersMatchingUserName={this.props.getUsersMatchingUserName} getUserForEPPN={this.props.getUserForEPPN} 
            userLookupByUserName={this.props.userLookupByUserName} userLookupByFullName={this.props.userLookupByFullName} userLookupByPreferredEmail={this.props.userLookupByPreferredEmail}
            showModal={this.state.showRegisterUserModal} setShowModal={(val) => { this.setState({showRegisterUserModal: val})} } requestUserAccount={this.props.requestUserAccount }/>
          <EditDescriptionModal facility={this.props.facility}
            showModal={this.state.showEditDescModal} 
            setShowModal={(val) => { this.setState({showEditDescModal: val})} }
            updateFacilityDesc={this.props.updateFacilityDesc}
            />
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
  const [ userLookupByUserName ] = useLazyQuery(USER_LOOKUP_BY_USERNAME);
  const [ userLookupByFullName ] = useLazyQuery(USER_LOOKUP_BY_FULLNAME);
  const [ userLookupByPreferredEmail ] = useLazyQuery(USER_LOOKUP_BY_PREFERRED_EMAIL);
  const [ addCzarMutation ] = useMutation(ADD_CZAR_MUTATION);
  const [ removeCzarMutation ] = useMutation(REMOVE_CZAR_MUTATION);
  const [ requestUserAccount ] = useMutation(REQUEST_USERACCOUNT_MUTATION);
  const [ addUpdtComputePurchase ] = useMutation(ADDUPDT_COMPUTE_PURCHASE);
  const [ addUpdtStoragePurchase ] = useMutation(ADDUPDT_STORAGE_PURCHASE);
  const [ updateFacilityDesc ] = useMutation(UPDATE_FACILITY_DESC);

  let addRemoveCzar = function(username, selected) {
    if(selected) {
      console.log("Adding user " + username + " as a czar to facility " + facility);
      addCzarMutation({ variables: { facilityinput: { name: props.facilityname }, user: { username: username } }, refetchQueries: [ FACILITYDETAILS, 'Facility' ], onError: (error) => { console.log("Error when adding czar " + error); } });
    } else {
      console.log("Removing user " + username + " as a czar from facility " + facility);
      removeCzarMutation({ variables: { facilityinput: { name: props.facilityname }, user: { username: username } }, refetchQueries: [ FACILITYDETAILS, 'Facility' ], onError: (error) => { console.log("Error when removing czar " + error); } });
    }
  }

  const requestAccount = (user, callWhenDone, onError) => {
    const username = user["username"];
    const eppn = username + "@slac.stanford.edu";
    console.log("Account requested for eppn " + eppn + " in facility "  + props.facilityname + " with preferred username " + username);
    requestUserAccount({ variables: { request: { reqtype: "UserAccount", eppn: eppn, preferredUserName: username, "facilityname": props.facilityname, "approvalstatus": "PreApproved"}}, 
      onCompleted: (data) => { console.log(data); callWhenDone(data)},
      onError: (error) => { console.log(error); onError(error.message)}
    }).catch(err => { console.log(err); onError(err.message)});
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

  let actuallyChangeDescription = function(newdescription, callWhenDone, onError){
    updateFacilityDesc({ 
      variables: { facilityinput: { name: props.facilityname }, newdescription: newdescription }, 
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
  const recentusagebycluster = {pastHour: data.pastHour, pastDay: data.pastDay, pastWeek: data.pastWeek}
  

  return (<div>
    <FacilityDetails facility={facility} isAdmin={isAdmin} getUserForEPPN={getUserForEPPN} clusters={clusters} storagenames={storagenames} storagepurposes={storagepurposes}
    onSelDesel={addRemoveCzar} requestUserAccount={requestAccount} getUsersMatchingUserName={getUsersMatchingUserName}
    addUpdateComputePurchase={addUpdateComputePurchase} addUpdateStoragePurchase={addUpdateStoragePurchase}
    userLookupByUserName={userLookupByUserName} userLookupByFullName={userLookupByFullName} userLookupByPreferredEmail={userLookupByPreferredEmail}
    recentusagebycluster={recentusagebycluster} updateFacilityDesc={actuallyChangeDescription}
    />
  </div>);
}
