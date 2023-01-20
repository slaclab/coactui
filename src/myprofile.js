import React, { Component, useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import _ from "lodash";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import Alert from 'react-bootstrap/Alert';
import InputGroup from 'react-bootstrap/InputGroup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faPlus } from '@fortawesome/free-solid-svg-icons'


const HOMEDETAILS = gql`
query {
  whoami {
    Id
    username
    fullname
    uidnumber
    eppns
    preferredemail
    shell
    publichtml
    isAdmin
    groups
    storages {
      Id
      purpose
      gigabytes
      inodes
      storagename
      rootfolder
      usage {
        gigabytes
        inodes
      }
    }
  }
}
`;

const CHANGE_USER_SHELL_MUTATION = gql`
mutation changeUserShell($newshell: String!){
  changeUserShell(newshell: $newshell){
    username
    shell
  }
}
`;

const USER_UPDATE_EPPN_MUTATION = gql`
mutation userUpdateEppn($eppns: [String!]!){
  userUpdateEppn(eppns: $eppns){
    username
    shell
    eppns
  }
}
`;

const USER_UPDATE_USER = gql`
mutation userUpdate($user: UserInput!){
  userUpdate(user: $user){
    username
    shell
    eppns
    preferredemail
  }
}
`;

const QUOTA_REQUEST = gql`
mutation userQuotaRequest($request: CoactRequestInput!){
  userQuotaRequest(request: $request){
    Id
  }
}
`;

class ChangePreferredEmail extends Component {
  constructor(props) {
    super(props);
    this.state = { preferredemail: props.userdetails.preferredemail, preferredemailInvalid: false }
    this.handleClose = () => { this.props.setShow(false); }
    this.setPreferredEmail = (event) => { this.setState({ preferredemail: event.target.value }) }
    this.changePreferredEmail = () => {
      console.log(this.state.preferredemail);
      if(_.isEmpty(this.state.preferredemail)) {
        this.setState({ preferredemailInvalid: true });
        return;
      }
      const emailre = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
      if(!String(this.state.preferredemail).toLowerCase().match(emailre)) {
        this.setState({ preferredemailInvalid: true});
        return;
      }

      this.props.changePreferredEmail(this.state.preferredemail);
      this.props.setShow(false);
    }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Preferred email for {this.props.userdetails.username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Form.Text>Please enter an preferred email address that we can use to contact you</Form.Text>
            <InputGroup hasValidation>
              <Form.Control type="text" value={this.state.preferredemail} placeholder="Please enter a valid email address" onChange={this.setPreferredEmail} isInvalid={this.state.preferredemailInvalid}/>
              <Form.Control.Feedback type="invalid">Please enter a valid email address</Form.Control.Feedback>
            </InputGroup>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={this.changePreferredEmail}>
            Change Preferred Email
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

class ChangeUserShell extends Component {
  constructor(props) {
    super(props);
    this.state = { shell: props.userdetails.shell, shellInvalid: false }
    this.handleClose = () => { this.props.setShow(false); }
    this.changeUserShell = () => {
      console.log(this.state.shell);
      if(_.isEmpty(this.state.shell)) {
        this.setState({ shellInvalid: true });
        return;
      }
      this.props.changeUserShell(this.state.shell);
      this.props.setShow(false);
    }
    this.setShell = (event) => { this.setState({ shell: event.target.value }) }
    this.supportedShells = [
      "/bin/sh",
      "/bin/bash",
      "/bin/csh",
      "/bin/zsh"
    ]
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Change shell for {this.props.userdetails.username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <InputGroup hasValidation>
              <Form.Select name="shell" value={this.state.shell} onChange={this.setShell}  isInvalid={this.state.shellInvalid}>
                <option value="">Please choose a shell</option>
                { _.map(this.supportedShells, (s) => { return (<option key={s} value={s}>{s}</option>)}) }
              </Form.Select>
              <Form.Control.Feedback type="invalid">Please choose a valid shell.</Form.Control.Feedback>
            </InputGroup>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={this.changeUserShell}>
            Change Shell
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

class AddRemoveEPPNs extends Component {
  constructor(props) {
    super(props);
    this.state = { eppns: props.userdetails.eppns, newEPPN: "", newEPPNInvalid: false, newEPPNInvalidMessage: "", moreThanOneEPPN: props.userdetails.eppns.length > 1, serversideerror: false, serversideerrormsg: "" }
    this.handleClose = () => { this.props.setShow(false); }

    this.setNewEppn = (event) => { this.setState({ newEPPN: event.target.value})}
    this.updateEPPNs = () => {
      this.setState({ serversideerror: false, serversideerrormsg: "" });
      if(_.isEmpty(_.xor(this.state.eppns, this.props.eppns))) {
        console.log("No changes to EPPNs");
        return;
      }
      this.props.updateEppns(this.state.eppns, (errormsg) => this.setState({ eppns: props.userdetails.eppns, serversideerror: true, serversideerrormsg: "" + errormsg}));
    }
    this.addNewEPPN = (event) => {
      this.setState({ newEPPNInvalid: false,  newEPPNInvalidMessage: ""});
      if(_.isEmpty(this.state.newEPPN)) {
        this.setState({ newEPPNInvalid: true,  newEPPNInvalidMessage: "An EPPN cannot be empty"});
        return;
      }
      const emailre = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
      if(!String(this.state.newEPPN).toLowerCase().match(emailre)) {
        this.setState({ newEPPNInvalid: true,  newEPPNInvalidMessage: "Please use a valid EPPN. For example, userid@institution.org"});
        return;
      }
      if(_.includes(this.state.eppns, this.state.newEPPN)) {
        this.setState({ newEPPNInvalid: true,  newEPPNInvalidMessage: this.state.newEPPN + " is already being used"});
        return;
      }
      const updatedEppns = _.concat(this.state.eppns, [this.state.newEPPN])
      this.setState({eppns: updatedEppns, newEPPN: "", moreThanOneEPPN: updatedEppns.length > 1}, () => { this.updateEPPNs(); });
    }
    this.removeEppn = (eppn) => {
      let updatedEppns = _.without(this.state.eppns, eppn);
      if(_.isEmpty(updatedEppns)) {
        console.log("Can't have an empty EPPN list"); // We really should not be here
        return;
      }
      this.setState({ eppns: updatedEppns, moreThanOneEPPN: updatedEppns.length > 1 }, () => { this.updateEPPNs(); });
    }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Add remove EPPN's for {this.props.userdetails.username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert show={this.state.serversideerror}>{this.state.serversideerrormsg}</Alert>
          <Table bordered>
            <tbody>
              { _.map(this.state.eppns, (e) => { return (<tr key={e}><td>{e}</td><td><Button className={this.state.moreThanOneEPPN ? "" : "d-none"} size="sm" onClick={() => this.removeEppn(e)}><FontAwesomeIcon icon={faXmark}/></Button></td></tr>) }) }
            </tbody>
          </Table>
          <Form.Label type="text">To add a new EPPN, please use the box below</Form.Label>
          <InputGroup hasValidation>
            <Form.Control type="text" placeholder="Enter new EPPN userid@institution.org" value={this.state.newEPPN} onChange={this.setNewEppn} isInvalid={this.state.newEPPNInvalid}/>
            <Button size="sm" onClick={this.addNewEPPN}><FontAwesomeIcon icon={faPlus}/></Button>
            <Form.Control.Feedback type="invalid">{this.state.newEPPNInvalidMessage}</Form.Control.Feedback>
          </InputGroup>
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

class StorageQuotaRequest extends Component {
  constructor(props) {
    super(props);
    this.state = { gigabytes: props.storage.gigabytes, inodes: props.storage.inodes, notes: "", gigabytesinvalid: false, inodesinvalid: false
    }
    this.handleClose = () => { this.props.setShow(false); }
    this.setgigabytes = (event) => { this.setState({ gigabytes: _.toNumber(event.target.value) }) }
    this.setinodes = (event) => { this.setState({ inodes: _.toNumber(event.target.value) }) }
    this.setnotes = (event) => { this.setState({ notes: event.target.value }) }

    this.quotaRequest = () => {
      console.log(this.state);
      this.props.requestQuota(this.props.storage.storagename, this.state.gigabytes, this.state.inodes, this.props.storage.purpose, this.state.notes);
      this.props.setShow(false);
    }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Quota request for {this.props.userdetails.username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Text>Request a change in quota on volume {this.props.storage.storagename} used for {this.props.storage.purpose}. <br/> You currently have {this.state.gigabytes} GB</Form.Text>
          <Row className="mb-3">
            <InputGroup hasValidation>
              <Form.Control className="my-2" type="text" value={this.state.gigabytes} placeholder="Please enter the storage requested in GB" onChange={this.setgigabytes} isInvalid={this.state.gigabytesinvalid}/>
              <InputGroup.Text className="my-2">GB</InputGroup.Text>
              <Form.Control.Feedback type="invalid">Please enter a valid gigabytes</Form.Control.Feedback>
            </InputGroup>
          </Row>
          <Form.Text>You currently have {this.state.inodes} files</Form.Text>
          <Row className="mb-3">
            <InputGroup hasValidation>
              <Form.Control className="my-2" type="text" value={this.state.inodes} placeholder="Please enter the inodes requested in files" onChange={this.setinodes} isInvalid={this.state.inodesinvalid}/>
              <InputGroup.Text className="my-2">files</InputGroup.Text>
              <Form.Control.Feedback type="invalid">Please enter a valid inodes</Form.Control.Feedback>
            </InputGroup>
          </Row>
          <Row className="mb-3">
            <InputGroup>
              <Form.Control as="textarea" rows={3} value={this.state.notes} placeholder="Please enter any additional comments" onChange={this.setnotes}/>
            </InputGroup>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={this.quotaRequest}>
            Request a change
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

class UserStorage extends Component {
  constructor(props) {
    super(props);
    this.state = { showModal: false }
    this.setShowModal = (show) => { this.setState({ showModal: show }) }
  }

  render() {
    return (
      <>
      <Row><Card.Subtitle title={this.props.storage.rootfolder}>{this.props.storage.purpose}</Card.Subtitle><hr/></Row>
      <Row>
        <Col>
          <Row className="mx-2">Used {this.props.storage.usage.gigabytes} GB of {this.props.storage.gigabytes} GB</Row>
          <Row className="mx-2">Used {this.props.storage.usage.inodes} files of {this.props.storage.inodes} max files</Row>
        </Col>
        <Col md={3}>
          <Button className="my-2" variant="secondary" onClick={() => this.setState({showModal: true})}>Request more</Button>
        </Col>
      </Row>
      <StorageQuotaRequest show={this.state.showModal} setShow={this.setShowModal} userdetails={this.props.userdetails} storage={this.props.storage} requestQuota={this.props.requestQuota} />
      </>
    )
  }
}


class RequestPublicHTML extends Component {
  constructor(props) {
    super(props);
    this.state = { agreedToConditions: false, showErr: false }
    this.handleClose = () => { this.props.setShow(false); }
    this.agreeToConditions = (event) => { console.log(event.target.checked); this.setState({ agreedToConditions: event.target.checked, showErr: false  }) }
    this.enablePublicHTML = () => {
      console.log(this.state.agreedToConditions);
      if(!this.state.agreedToConditions) {
        this.setState({ showErr: true });
        return;
      }

      this.props.enablePublicHTML(true);
      this.props.setShow(false);
    }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Enable public HTML for {this.props.userdetails.username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <div>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</div>
            <InputGroup className="mt-3" hasValidation>
              <InputGroup.Text>I agree to these terms and conditions</InputGroup.Text>
              <InputGroup.Checkbox value={this.state.agreedToConditions} onChange={this.agreeToConditions} isInvalid={this.state.showErr} />
              <Alert show={this.state.showErr}>Please agree to the terms and conditions to turn on your public HTML space.</Alert>
            </InputGroup>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={this.enablePublicHTML}>
            Enable public HTML
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}


class UserDetails extends Component {
  constructor(props) {
    super(props);
    this.showUserShellModal = function() { props.setChgShellShow(true) }
    this.showEppnModal = function() { props.setUpdtEppnShow(true) }
    this.showPrefEmailModal = function() { props.setUpdtPrefEmail(true) }
    this.showPublicHTML = function() { props.setEnblPublicHtml(true) }
    this.publichtmlurl = "/~" + props.userdetails.username + "/public_html/";
  }
  render() {
    return (
      <>
      <Container fluid>
        <Row>
          <Col>
            <Card>
              <Card.Header>Account</Card.Header>
              <Card.Body>
                <Row className="my-1"><Col md={3}><span className="tbllbl">Userid</span></Col><Col>{this.props.userdetails.username}</Col></Row>
                <Row className="my-1"><Col md={3}><span className="tbllbl">UID</span></Col><Col>{this.props.userdetails.uidnumber}</Col></Row>
                <Row className="my-1"><Col md={3}><span className="tbllbl">Name</span></Col><Col>{this.props.userdetails.fullname}</Col></Row>
                <hr/>
                <Row><Col md={3}><span className="tbllbl">Preferred Email</span></Col><Col md={5}>{this.props.userdetails.preferredemail}</Col><Col><Button variant="secondary" onClick={this.showPrefEmailModal}>Change</Button></Col></Row>
                <hr/>
                <Row><Col md={3}><span className="tbllbl">Shell</span></Col><Col md={5}>{this.props.userdetails.shell}</Col><Col><Button variant="secondary" onClick={this.showUserShellModal}>Change my shell</Button></Col></Row>
                <hr/>
                <Col>
                  <Row><Card.Subtitle>EPPNs</Card.Subtitle></Row>

                  <Row><Col md={8}><ul className="ps-5">
                  {
                    _.map(this.props.userdetails.eppns, (e) => { return (<li key={e}>{e}</li>) })
                  }
                  </ul></Col><Col><Button className="d-none" variant="secondary" onClick={this.showEppnModal} >Add/remove EPPNs</Button></Col>
                  </Row>
                </Col>
                <hr/>
                <Row><Card.Subtitle>Group memberships</Card.Subtitle><ul className="ps-5">
                {
                  _.map(this.props.userdetails.groups, (e) => { return (<li key={e}>{e}</li>) })
                }
                </ul></Row>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Row>
              <Card>
                <Card.Header>Storage</Card.Header>
                <Card.Body>
                {
                  _.map(this.props.userdetails.storages, (s) => { return (<UserStorage key={s.Id} userdetails={this.props.userdetails} storage={s} requestQuota={this.props.requestQuota} />) })
                }
                </Card.Body>
              </Card>
            </Row>
            <Row>
              <Card>
                <Card.Header>Public HTML</Card.Header>
                <Card.Body>
                <Row className="mt-2"><Col>{this.props.userdetails.publichtml ? (<span>Your public HTML pages are viewable <a href={this.publichtmlurl}>here</a></span>) : "You have not turned on the public html space"}</Col>
                <Col md={3}>
                  {
                    this.props.userdetails.publichtml ? (<span></span>) : (<Button className="my-2" variant="secondary" onClick={this.showPublicHTML}>Request</Button>)
                  }
                </Col>
                </Row>
                </Card.Body>
              </Card>
            </Row>
          </Col>
        </Row>
      </Container>
      </>
    );
  }
}


export default function MyProfile() {
  const { loading, error, data } = useQuery(HOMEDETAILS, { errorPolicy: 'all'} );
  const [ chgShellfn, { chgShelldata, chgShellloading, chgShellerror }] = useMutation(CHANGE_USER_SHELL_MUTATION);
  const [ updtEppnfn, { updtEppndata, updtEppnloading, updtEppnerror }] = useMutation(USER_UPDATE_EPPN_MUTATION);
  const [ updtUserfn, { updtUserdata, updtUserloading, updtUsererror }] = useMutation(USER_UPDATE_USER);
  const [ quotafn, { quotadata, quotaloading, quotaerror }] = useMutation(QUOTA_REQUEST);

  const [chgShellShow, setChgShellShow] = useState(false);
  const [updtEppnShow, setUpdtEppnShow] = useState(false);
  const [updtPrefEmail, setUpdtPrefEmail] = useState(false);
  const [enblPublicHtml, setEnblPublicHtml] = useState(false);

  const changeUserShell = (newshell) => {
    console.log("Changing shell to " + newshell);
    chgShellfn({ variables: { newshell: newshell }, refetchQueries: [ HOMEDETAILS, 'whoami' ]});
    setChgShellShow(false);
  };

  const updateEppns = (neweppns, onerrorfunction) => {
    console.log("Changing EPPNs to " + _.join(neweppns, ","));
    updtEppnfn({ variables: { eppns: neweppns }, refetchQueries: [ HOMEDETAILS, 'whoami' ], onError: (error) => { onerrorfunction(error); }});
  };

  const changePreferredEmail = (newpreferredemail) => {
    console.log("Changing preferred email to " + newpreferredemail);
    updtUserfn({ variables: { user: { Id: data["whoami"]["Id"], username: data["whoami"]["username"], preferredemail: newpreferredemail } }, refetchQueries: [ HOMEDETAILS, 'whoami' ]});
    setUpdtPrefEmail(false);
  };

  const requestQuota = (storagename, gigabytes, inodes, purpose, notes) => {
    console.log("Putting in a request for changing the quota");
    quotafn({ variables: { request: { reqtype: "UserStorageAllocation", storagename: storagename, gigabytes: gigabytes, inodes: inodes, purpose: purpose, notes: notes }}});
  };

  const enablePublicHTML = () => {
    console.log("Enabling public HTML for user");
    updtUserfn({ variables: { user: { Id: data["whoami"]["Id"], username: data["whoami"]["username"], publichtml: true } }, refetchQueries: [ HOMEDETAILS, 'whoami' ]});
    setEnblPublicHtml(false);
  };


  if (loading) return <p>Loading...</p>;
//  if (error) return <p>Error :</p>;

	  console.log(data);

  return (
    <>
      <ChangeUserShell show={chgShellShow} setShow={setChgShellShow} userdetails={data["whoami"]} changeUserShell={changeUserShell} />
      <AddRemoveEPPNs show={updtEppnShow} setShow={setUpdtEppnShow} userdetails={data["whoami"]} updateEppns={updateEppns} />
      <ChangePreferredEmail show={updtPrefEmail} setShow={setUpdtPrefEmail} userdetails={data["whoami"]} changePreferredEmail={changePreferredEmail} />
      <RequestPublicHTML show={enblPublicHtml} setShow={setEnblPublicHtml} userdetails={data["whoami"]} enablePublicHTML={enablePublicHTML} />
      <UserDetails userdetails={data["whoami"]} setChgShellShow={setChgShellShow} setUpdtEppnShow={setUpdtEppnShow} setUpdtPrefEmail={setUpdtPrefEmail} setEnblPublicHtml={setEnblPublicHtml} requestQuota={requestQuota}/>
    </>
  );
}
