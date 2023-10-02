import _ from "lodash";
import { NavLink } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import React, { Component, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faUpLong, faDownLong } from '@fortawesome/free-solid-svg-icons'
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import ModalHeader from 'react-bootstrap/ModalHeader';
import ModalBody from 'react-bootstrap/ModalBody';
import ModalFooter from 'react-bootstrap/ModalFooter';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';

const REPOS = gql`
query{
  myRepos {
    name
    facility
    principal
    leaders
    users
    group
    description
    computerequirement
  }
  whoami {
    username
    isAdmin
    subjectFacilities
  }
}`;

const UPDATE_REPO_MUTATION = gql`
mutation repoUpdate($reposinput: RepoInput!){
  repoUpdate(repo: $reposinput){
    name
  }
}
`;

const UPDATE_REPO_PI_MUTATION = gql`
mutation repoChangePrincipal($reposinput: RepoInput!, $user: UserInput!){
  repoChangePrincipal(repo: $reposinput, user: $user){
    name
  }
}
`;

const REQUEST_COMPUTE_REQUIREMENT_CHANGE = gql`
mutation requestRepoChangeComputeRequirement($request: CoactRequestInput!){
  requestRepoChangeComputeRequirement(request: $request){
    Id
  }
}
`;

const APPROVE_REQUEST_MUTATION = gql`
mutation ApproveRequest($Id: String!){
  requestApprove(id: $Id)
}
`;


class ChangePI extends Component {
  constructor(props) {
    super(props);
    this.state = { newPI: props.repo.princpial, isError: false, errMsg: "" }
    this.changePI = (event) => { this.setState({newPI: event.target.value, isError: false, errMsg: ""}) }
    this.changePIOnServer = () => {
      if(_.isEmpty(this.state.newPI)) {
        this.setState({isError: true, errMsg: "Please choose a valid PI"});
        return;
      }
      this.props.changePI(this.props.repo.name, this.props.repo.facility, this.state.newPI, () => { this.props.setShowModal(false) }, (error) => { console.log(error); this.setState({ isError: true, errMsg: error.message })  } )
    }
  }

  render() {
    return (
      <Modal show={this.props.showModal}>
        <ModalHeader>
          <div>Change the PI for repo <b className="text-primary">{this.props.repo.name}</b> in facility <b className="text-primary">{this.props.repo.facility}</b> </div>
        </ModalHeader>
        <ModalBody>
          <InputGroup hasValidation>
            <Form.Select name="newPI" value={this.state.newPI} onChange={this.changePI}  isInvalid={this.state.isError}>
                <option value="">Please choose a new PI</option>
                { _.map(this.props.repo.users, (s) => { return (<option key={s} value={s}>{s}</option>)}) }
              </Form.Select>
            <Form.Control.Feedback type="invalid">{this.state.errMsg}</Form.Control.Feedback>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Close
          </Button>
          <Button onClick={this.changePIOnServer}>
            Done
          </Button>
        </ModalFooter>
    </Modal>
    );
  }
}

class ChangeDescription extends Component {
  constructor(props) {
    super(props);
    this.state = { newdescription: props.repo.description, isError: false, errMsg: "" }
    this.changeDescription = (event) => { this.setState({newdescription: event.target.value, isError: false, errMsg: ""}) }
  }

  render() {
    return (
      <Modal show={this.props.showModal}>
        <ModalHeader>
          <div>Change the description for repo <b className="text-primary">{this.props.repo.name}</b> in facility <b className="text-primary">{this.props.repo.facility}</b> </div>
        </ModalHeader>
        <ModalBody>
          <InputGroup hasValidation>
            <Form.Control onBlur={this.changeDescription} isInvalid={this.state.isError} defaultValue={this.state.newdescription}/>
            <Form.Control.Feedback type="invalid">{this.state.errMsg}</Form.Control.Feedback>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Close
          </Button>
          <Button onClick={() => { this.props.changeRepoDescription(this.props.repo.name, this.props.repo.facility, this.state.newdescription, () => { this.props.setShowModal(false) }, (error) => { console.log(error); this.setState({ isError: true, errMsg: error.message })  } ) }}>
            Done
          </Button>
        </ModalFooter>
    </Modal>
    );
  }
}

class ChangeLDAPGroup extends Component {
  constructor(props) {
    super(props);
    this.state = { newgroup: props.repo.group ? props.repo.group : props.repo.name, isError: false, errMsg: "" }
    this.changeGroup = (event) => { this.setState({newgroup: event.target.value, isError: false, errMsg: ""}) }
  }

  render() {
    return (
      <Modal show={this.props.showModal}>
        <ModalHeader>
          <div>Change the LDAP group for repo <b className="text-primary">{this.props.repo.name}</b> in facility <b className="text-primary">{this.props.repo.facility}</b> </div>
        </ModalHeader>
        <ModalBody>
          <InputGroup hasValidation>
            <Form.Control onBlur={this.changeGroup} isInvalid={this.state.isError} defaultValue={this.state.newgroup}/>
            <Form.Control.Feedback type="invalid">{this.state.errMsg}</Form.Control.Feedback>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Close
          </Button>
          <Button onClick={() => { this.props.changeRepoGroup(this.props.repo.name, this.props.repo.facility, this.state.newgroup, () => { this.props.setShowModal(false) }, (error) => { console.log(error); this.setState({ isError: true, errMsg: error.message })  } ) }}>
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
    let isAdminOrCzar = this.props.userinfo.isAdmin || _.includes(this.props.userinfo.subjectFacilities, this.props.repo.facility);
    let currCompRequirement = _.isNil(this.props.repo.computerequirement) ? "Normal" :  this.props.repo.computerequirement;
    this.state = { 
      showPI: false, 
      showGrp: false, 
      showDesc: false
    };
    this.changePI = (event) => {  this.setState({showPI: true}) }
    this.changeLDAPGroup = (event) => {  this.setState({showGrp: true}) }
    this.changeDescription = (event) => {  this.setState({showDesc: true}) }
    this.reallyChangeComputeRequirement = (newcomp) => { 
      props.changeComputeRequirement(this.props.repo.name, this.props.repo.facility, newcomp, () => { this.props.displayConfirmation("A request to change the compute requirement has been issued; the actual change is done in the background and will take a few seconds. The UI will refresh in a few seconds; if the change is not reflected then, please refresh your screen manually"); });
    }
  }
  render() {
    let isAdminOrCzar = this.props.userinfo.isAdmin || _.includes(this.props.userinfo.subjectFacilities, this.props.repo.facility);
    let currCompRequirement = _.isNil(this.props.repo.computerequirement) ? "Normal" :  this.props.repo.computerequirement,
      compreqclass = isAdminOrCzar ? "float-end" : "d-none",
      comprequpclass = (isAdminOrCzar && !_.includes(["OnShift"], currCompRequirement)) ? "text-warning px-2" : "d-none",
      compreqdownclass = (isAdminOrCzar && _.includes(["OnShift", "OffShift"], currCompRequirement)) ? "text-warning px-2" : "d-none";
    let upComputeReq = () => { 
        if(currCompRequirement == "OffShift") {
          this.reallyChangeComputeRequirement("OnShift");
        } else {
          this.reallyChangeComputeRequirement("OffShift");
        }
      }
    let downComputeReq = () => { 
        if(currCompRequirement == "OnShift") {
          this.reallyChangeComputeRequirement("OffShift");
        } else if(currCompRequirement == "OffShift") {
          this.reallyChangeComputeRequirement("Normal");
        }
      }
  
      return (
        <tr key={this.props.repo.name}>
          <td className="vmid">{this.props.repo.name}</td>
          <td className="vmid">{this.props.repo.facility}</td>
          <td className="vmid">{this.props.repo.principal} { isAdminOrCzar ? <span className="inlntlbr select_role px-2 text-warning" title="Change the PI for this repo" onClick={this.changePI}><FontAwesomeIcon icon={faEdit}/></span> : ""}</td>
          <td className="vmid">{this.props.repo.group} { isAdminOrCzar ? <span className="inlntlbr select_role px-2 text-warning" title="Change the LDAP group associated with this repo" onClick={this.changeLDAPGroup}><FontAwesomeIcon icon={faEdit}/></span> : ""}</td>
          <td className="vmid">{this.props.repo.description} { isAdminOrCzar ? <span className="inlntlbr select_role px-2 text-warning" title="Edit this repo's description" onClick={this.changeDescription}><FontAwesomeIcon icon={faEdit}/></span> : ""}</td>
          <td>{currCompRequirement}
            <span className={compreqclass}>
              <span title="Bump down the compute requirement for this repo" className={compreqdownclass} onClick={downComputeReq}><FontAwesomeIcon icon={faDownLong}/></span>
              <span title="Bump up the compute requirement for this repo" className={comprequpclass} onClick={upComputeReq}><FontAwesomeIcon icon={faUpLong}/></span>
            </span>
          </td>
          <ChangePI showModal={this.state.showPI} setShowModal={() => this.setState({showPI: false})} repo={this.props.repo} changePI={this.props.changePI} />
          <ChangeDescription showModal={this.state.showDesc} setShowModal={() => this.setState({showDesc: false})} repo={this.props.repo} changeRepoDescription={this.props.changeRepoDescription} />
          <ChangeLDAPGroup showModal={this.state.showGrp} setShowModal={() => this.setState({showGrp: false})} repo={this.props.repo} changeRepoGroup={this.props.changeRepoGroup} />
        </tr>
      );
  }
}


class ReposTable extends Component {
  constructor(props) {
    super(props);
    this.state = { showToast: false, toastMsg: "" }
    this.displayConfirmation = (message) => { 
      this.setState({showToast: true, toastMsg: message})
    }
  }
  render() {
    return (
      <>
      <ToastContainer className="p-3" position={"top-end"} style={{ zIndex: 1 }}>
        <Toast show={this.state.showToast} onClose={() => { this.setState({showToast: false, toastMsg: ""})}} delay={10000} autohide><Toast.Header>Info</Toast.Header><Toast.Body>{this.state.toastMsg}</Toast.Body></Toast>
      </ToastContainer>
      <div className="container-fluid text-center">
        <table className="table table-condensed table-striped table-bordered table-responsive">
          <thead>
            <tr><th>Repo name</th><th>Facility</th><th>PI</th><th>LDAP Group</th><th>Description</th><th>Compute Requirement</th></tr>
          </thead>
          <tbody>
            { _.map(this.props.repos, (r) => { return (<ReposRows key={r.facility+"_"+r.name} repo={r} userinfo={this.props.userinfo}
              displayConfirmation={this.displayConfirmation}
              changeRepoDescription={this.props.changeRepoDescription} changeRepoGroup={this.props.changeRepoGroup} changePI={this.props.changePI} 
              changeComputeRequirement={this.props.changeComputeRequirement} />) }) }
          </tbody>
        </table>
      </div>
      </>
     )
  }
}

export default function ReposInfoListView() {
  const { loading, error, data, refetch } = useQuery(REPOS);
  const [ updateRepoMutation ] = useMutation(UPDATE_REPO_MUTATION);
  const [ changeRepoPIMutation ] = useMutation(UPDATE_REPO_PI_MUTATION);
  const [ repoChangeComputeRequirement ] = useMutation(REQUEST_COMPUTE_REQUIREMENT_CHANGE);
  const [ approveRequest ] = useMutation(APPROVE_REQUEST_MUTATION);


  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  const changeRepoDescription = (reponame, facilityname, newdescription, onSuccess, onError) => {
    updateRepoMutation({ variables: { reposinput: { name: reponame, facility: facilityname, description: newdescription }}, refetchQueries: [ REPOS ], onCompleted: onSuccess, onError:  onError});
  }

  const changeRepoGroup = (reponame, facilityname, newgroup, onSuccess, onError) => {
    updateRepoMutation({ variables: { reposinput: { name: reponame, facility: facilityname, group: newgroup }}, refetchQueries: [ REPOS ], onCompleted: onSuccess, onError:  onError});
  }

  const changePI = (reponame, facilityname, newPI, onSuccess, onError) => {
    changeRepoPIMutation({ variables: { reposinput: { name: reponame, facility: facilityname }, user: { username: newPI }}, refetchQueries: [ REPOS ], onCompleted: onSuccess, onError:  onError});
  }

  let requestAndApproveChangeComputeRequirement = function(reponame, facilityname, newCompRequirement, callWhenComplete) {
    console.log("Changing compute requirement to " + newCompRequirement);
    repoChangeComputeRequirement(
      { variables: { request: { reqtype: "RepoChangeComputeRequirement", reponame: reponame, facilityname: facilityname, computerequirement: newCompRequirement }},
      onCompleted: (compreqdata) => {
        let id = compreqdata["requestRepoChangeComputeRequirement"]["Id"]
        approveRequest({ variables: { Id: id }, refetchQueries: [ REPOS ], onCompleted: () => { callWhenComplete(); setTimeout(refetch, 5000) } });
      }
    });

  }

  let userinfo = _.get(data, "whoami");
  console.log(data);
  return (
    <>
    <ReposTable repos={data.myRepos} userinfo={userinfo} changeRepoDescription={changeRepoDescription} changeRepoGroup={changeRepoGroup} changePI={changePI} changeComputeRequirement={requestAndApproveChangeComputeRequirement} />
    </>
  );
}
