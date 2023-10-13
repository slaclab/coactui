import _ from "lodash";
import { NavLink } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import React, { Component, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit } from '@fortawesome/free-solid-svg-icons'
import { TwoPrecFloat } from "./widgets";
import Modal from 'react-bootstrap/Modal';
import ModalHeader from 'react-bootstrap/ModalHeader';
import ModalTitle from 'react-bootstrap/ModalTitle';
import ModalBody from 'react-bootstrap/ModalBody';
import ModalFooter from 'react-bootstrap/ModalFooter';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';


const REPOS = gql`
query{
  myRepos {
    Id
    name
    facility
    principal
    facilityObj {
      name
    }
    currentComputeAllocations {
      Id
      clustername
      start
      end
      percentOfFacility
      usage {
        slachours
        avgcf
      }
    }
  }
  whoami {
    username
    isAdmin
    isCzar
  }
  facilities {
    name
    computepurchases {
      purchased
      clustername
    }
  }
}`;

const ALLOCATION_REQUEST = gql`
mutation requestRepoComputeAllocation($request: CoactRequestInput!){
  requestRepoComputeAllocation(request: $request){
    Id
  }
}
`;

const APPROVE_REQUEST_MUTATION = gql`
mutation requestApprove($Id: String!){
  requestApprove(id: $Id)
}
`;


class UpdateComputeAllocation extends Component {
  constructor(props) {
    super(props);
    this.state = { currentAllocation: props.currentAllocation }
    this.setAllocation = (event) => { this.setState({currentAllocation: event.target.value}) }
  }

  render() {
    return (
      <Modal show={this.props.showModal} onHide={() => {this.props.hideModal()}}>
        <ModalHeader closeButton={true}>
          <ModalTitle>Update the compute allocation for the repo <b className="em">{this.props.reponame}</b> on the cluster <b className="em">{this.props.clustername}</b></ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p>A compute allocation is specified as a percentage of the facility's allocation.</p>
          <p>The facility <b className="em">{this.props.facilityname}</b> has purchased <b className="em">{this.props.facilityPurchased}</b> on the <b className="em">{this.props.clustername}</b> cluster</p>
          <InputGroup hasValidation>
            <InputGroup.Text>Current Percent:</InputGroup.Text>
            <Form.Control type="number" onBlur={this.setAllocation} isInvalid={this.props.isError} defaultValue={this.props.currentAllocation}/>
            <Form.Control.Feedback type="invalid">{this.props.errorMessage}</Form.Control.Feedback>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.hideModal()}}>
            Close
          </Button>
          <Button onClick={() => { this.props.applyUpdateAllocation(this.state.currentAllocation) }}>
            Done
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}


class ReposRows extends Component {
  constructor(props) {
    super(props);
    this.reponame = props.repo.name;
    this.facility = props.repo.facility;
    this.facilityData = _.find(this.props.facilities, ["name", props.repo.facility]);
  }
  render() {
    var first = true;
    let cas = _.get(this.props.repo, "currentComputeAllocations", [{}]), rows = cas.length;
    let trs = _.map(cas, (a) => {
      let facilityPurchased = _.get(_.find(this.facilityData.computepurchases, ["clustername", a.clustername]), "purchased", 0.0);
      let totalAllocatedCompute = _.get(a, "percentOfFacility", 0.0)*facilityPurchased/100.0;
      let totalUsedHours = _.sum(_.map(_.get(a, "usage", []), "slachours"));
      if(first) {
        first = false;
        return (
          <tr key={this.facility+this.reponame+a.clustername} data-name={this.reponame}>
            <td rowSpan={rows} className="vmid">{this.reponame}</td>
            <td rowSpan={rows} className="vmid">{this.props.repo.facilityObj.name}</td>
            <td rowSpan={rows} className="vmid">{this.props.repo.principal}</td>
            <td><NavLink to={"/repos/compute/"+this.props.repo.facility+"/"+this.reponame+"/allocation/"+a.Id} key={this.reponame}>{a.clustername}</NavLink></td>
            <td>{totalAllocatedCompute} {this.props.canEditAllocations ? <span className="px-2 text-warning" title="Edit allocated amount" onClick={() => { this.props.showUpdateModal(this.props.repo.facilityObj.name, this.reponame, a.clustername, a.start, _.get(a, "percentOfFacility", 0.0), facilityPurchased) }}><FontAwesomeIcon icon={faEdit}/></span> : <span></span>}</td>
            <td><TwoPrecFloat value={totalUsedHours}/></td>
          </tr>)
        } else {
          return (
            <tr key={this.facility+this.reponame+a.clustername} data-name={this.reponame}>
              <td><NavLink to={"/repos/compute/"+this.props.repo.facility+"/"+this.reponame+"/allocation/"+a.Id} key={this.reponame}>{a.clustername}</NavLink></td>
              <td>{totalAllocatedCompute} {this.props.canEditAllocations ? <span className="px-2 text-warning" title="Edit allocated amount" onClick={() => { this.props.showUpdateModal(this.props.repo.facilityObj.name, this.reponame, a.clustername, a.start, _.get(a, "percentOfFacility", 0.0), facilityPurchased) }}><FontAwesomeIcon icon={faEdit}/></span> : <span></span>}</td>
              <td><TwoPrecFloat value={totalUsedHours}/></td>
            </tr>)
        }
    });
    return ( <tbody>{trs}</tbody> )
  }
}


class ReposTable extends Component {
  constructor(props) {
    super(props);
    this.state = { repo: "", facility: "", cluster: "", allocationStartTime: "", currentAllocation: 0, facilityPurchased: 0, showAddModal: false, showUpdateModal: false, updateModalClusterName: "", updateModalCurrentPurchase: 0, modalError: false, modalErrorMessage: "", showToast: false, toastMsg: ""};
    this.showUpdateModal = (facility, repo, cluster, allocationStartTime, curalloc, facilityPurchased) => { this.setState({repo: repo, facility: facility, cluster: cluster, allocationStartTime: allocationStartTime, currentAllocation: curalloc, facilityPurchased: facilityPurchased, showAddModal: false, showUpdateModal: true, updateModalClusterName: "", updateModalCurrentPurchase: 0, modalError: false, modalErrorMessage: "", showToast: false, toastMsg: ""}) }
    this.hideUpdateModal = () => { this.setState({repo: "", facility: "", cluster: "", allocationStartTime: "", currentAllocation: 0, facilityPurchased: 0, showAddModal: false, showUpdateModal: false, updateModalClusterName: "", updateModalCurrentPurchase: 0, modalError: false, modalErrorMessage: "", showToast: false, toastMsg: ""}) }
    this.applyUpdateAllocation = (curalloc) => { 
      if(curalloc < 0.0) {
        this.setState({modalError: true, modalErrorMessage: "Please enter a number >= 0"});
        return;
      }
      this.props.actuallyChangeAllocation(this.state.facility, this.state.repo, this.state.cluster, this.state.allocationStartTime, curalloc, 
        () => { 
          this.hideUpdateModal();
          this.setState({showToast: true, toastMsg: "A request to update the compute allocation has been made and approved. It will take a few seconds for this approval to be processed. Please refresh the screen after a little while to update the UI."})
        }, 
        (errormsg) => { this.setState({modalError: true, modalErrorMessage: errormsg})} );
    }
  }
  render() {
    return (
      <>
      <div className="container-fluid text-center table-responsive">
        <ToastContainer className="p-3" position={"top-end"} style={{ zIndex: 1 }}>
          <Toast show={this.state.showToast} onClose={() => { this.setState({showToast: false, toastMsg: ""})}} delay={10000} autohide><Toast.Header>Info</Toast.Header><Toast.Body>{this.state.toastMsg}</Toast.Body></Toast>
        </ToastContainer>
        <table className="table table-condensed table-striped table-bordered">
          <thead>
            <tr><th>Repo name</th><th>Facility</th><th>PI</th><th>ClusterName</th><th>Total compute allocation</th><th>Total compute used</th></tr>
          </thead>
          { _.map(this.props.repos, (r) => { return (<ReposRows key={r.facility+"_"+r.name} repo={r} facilities={this.props.facilities} canEditAllocations={this.props.canEditAllocations} showUpdateModal={this.showUpdateModal} />) }) }
          </table>
        </div>
        <UpdateComputeAllocation reponame={this.state.repo} facilityname={this.state.facility} clustername={this.state.cluster} currentAllocation={this.state.currentAllocation} facilityPurchased={this.state.facilityPurchased} showModal={this.state.showUpdateModal} showUpdateModal={this.showUpdateModal} hideModal={this.hideUpdateModal} isError={this.state.modalError} errorMessage={this.state.modalErrorMessage} applyUpdateAllocation={this.applyUpdateAllocation}/>
      </>
     )
  }
}

export default function ReposComputeListView() {
  const { loading, error, data, refetch } = useQuery(REPOS);
  const [ allocreq ] = useMutation(ALLOCATION_REQUEST);
  const [ requestApproveMutation ] = useMutation(APPROVE_REQUEST_MUTATION);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  let username = _.get(data, "whoami.username");
  let facilities = _.map(_.get(data, "facilities"), "name");
  console.log(data);

  let canEditAllocations = _.get(data, "whoami.isAdmin", false) ||  _.get(data, "whoami.isCzar", false);
  let approveRequest = function(reqid, callWhenDone, callOnError) {
    requestApproveMutation({ 
      variables: { Id: reqid }, 
      onCompleted: (data) => { callWhenDone(data); setTimeout(refetch, 5000) }, 
      onError: (error) => { callOnError(error.message) }, 
      refetchQueries: [ REPOS ] });
    }
  let actuallyChangeAllocation = function(facility, repo, cluster, allocationStartTime, curalloc, callWhenDone, callOnError) {
    console.log("Actually change allocations to " + curalloc + " for " + repo);
    allocreq({ variables: { request: { reqtype: "RepoComputeAllocation", facilityname: facility, reponame: repo, clustername: cluster, start: allocationStartTime, percentOfFacility: _.toNumber(curalloc) } }, 
      onCompleted: (data) => { console.log(data); approveRequest(data["requestRepoComputeAllocation"]["Id"], callWhenDone, callOnError)},
      onError: (error) => { console.log(error); callOnError(error.message)}});
  }

  return (
    <>
    <ReposTable repos={data.myRepos} facilities={data.facilities} canEditAllocations={canEditAllocations} actuallyChangeAllocation={actuallyChangeAllocation}/>
    </>
  );
}
