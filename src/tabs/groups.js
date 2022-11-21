import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import dayjs from "dayjs";
import _ from "lodash";
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import ModalHeader from 'react-bootstrap/ModalHeader';
import ModalBody from 'react-bootstrap/ModalBody';
import ModalFooter from 'react-bootstrap/ModalFooter';
import Form from 'react-bootstrap/Form';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { SearchAndAdd } from "./widgets";
import { Formik } from 'formik';
import * as yup from 'yup';


const REPODETAILS = gql`
query Repos($reposinput: RepoInput){
  repos(filter:$reposinput) {
    name
    facility
    principal
    leaders
    allUsers {
      username
    }
    accessGroupObjs {
      name
      gidNumber
      memberObjs {
        username
      }
    }
  }
  whoami {
    username
  }
}
`;

const TOGGLE_GROUPMEMBERSHIP_MUTATION = gql`
mutation ToggleUserRole($reposinput: RepoInput!, $user: UserInput!, $group: AccessGroupInput!){
  toggleGroupMembership(repo: $reposinput, user: $user, group: $group){
    name
  }
}
`;


class AddGroupModal extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let reponame = this.props.reponame, groupnames = this.props.groupnames;
    let schema = yup.object().shape({
      groupName: yup.string().required().test("Check prefix", "Group names must start with the repo name", function () {
        let gn = this.parent["groupName"];
        return gn && gn.startsWith(reponame) ? true : false;
      }).test("Group already exists", "The group name is already being used", function(){
        let gn = this.parent["groupName"];
        return gn && _.includes(groupnames, gn) ? false : true;
      }),
    });
    return (
      <Modal show={this.props.showModal}>
        <ModalHeader>
          Create a new access group for this repo. The access group name must have the repo name as a prefix.
        </ModalHeader>
        <Formik
          validationSchema={schema}
          onSubmit={values => { this.props.handleSubmit(values.groupName); }}
          initialValues={{
            groupName: this.props.reponame + "-"
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
              <ModalBody>
                <Row className="mb-3">
                  <Form.Group as={Col} md="8" controlId="validationFormik01" className="position-relative">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="groupName"
                      value={values.groupName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isValid={touched.groupName && !errors.groupName}
                      isInvalid={touched.groupName && errors.groupName}
                    />
                    <Form.Control.Feedback type='invalid' tooltip>{errors.groupName}</Form.Control.Feedback>
                  </Form.Group>
                </Row>
              </ModalBody>
              <ModalFooter>
                <Button variant="secondary" onClick={this.props.handleClose}>Close</Button>
                <Button type="submit">Create group</Button>
              </ModalFooter>
              </Form>
            )}
            </Formik>
      </Modal>
    );
  }
}

class GroupsTab extends React.Component {
  constructor(props) {
    super(props);
    this.state = { selectedGroup: "", usrswithsels: []}
    const groupnames = _.map(this.props.groups, "name");
    this.selGroup = (event) => {
      let grpName = event.currentTarget.dataset.name, grpObj = _.find(this.props.groups, ["name", grpName]);
      let selUserNames = _.map(_.get(grpObj, "memberObjs", []), "username");
      let newusrswithsels = _.map(this.props.allUsers, (u) => {
        return { "name": u["username"], "selected": _.includes(selUserNames, u["username"])  }
      })
      this.setState({selectedGroup: grpName, usrswithsels: newusrswithsels});
    }

    this.checkUncheck = (event) => {
      let selkey = event.target.dataset.selkey;
      this.props.onSelDesel(selkey, this.state.selectedGroup);
      this.setState((currentState) => {
        return _.find(currentState.usrswithsels, ["name", selkey]).selected = event.target.checked;
      })
    }

    this.hideModal = () => {
      this.props.setShowModal(false);
    }

    this.createGroup = (groupName) => {
      console.log("Need to create " + groupName);
      this.hideModal();
    }
  }

  render() {
    if(_.isEmpty(this.props.groups)) {
      return (<div className="container-fluid text-center tabcontainer">
      <AddGroupModal reponame={this.props.reponame} groupnames={this.groupnames} showModal={this.props.showModal}
        handleClose={this.hideModal} handleSubmit={this.createGroup}/>
        <div className="row">This repo does not have any access groups defined</div></div>)
    }

    return (
      <div className="container-fluid text-center tabcontainer">
        <AddGroupModal reponame={this.props.reponame} groupnames={this.groupnames} showModal={this.props.showModal}
        handleClose={this.hideModal} handleSubmit={this.createGroup}/>
        <div className="row">
          <div className="col table-responsive">
            <table className="table table-condensed table-striped table-bordered collabtbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>GID</th>
                </tr>
              </thead>
              <tbody>{
                _.map(this.props.groups, (g) => { return (<tr key={g.name} data-name={g.name} onClick={this.selGroup} className={(g.name === this.state.selectedGroup) ? "bg-primary": ""}><td>{g.name}</td><td>{g.gidNumber}</td></tr>) })
              }
              </tbody>
            </table>
          </div>
          <div className="col table-responsive">
            <table className="table table-condensed table-striped table-bordered collabtbl">
              <thead>
                <tr>
                  <th>UserID</th>
                  <th>UserName</th>
                </tr>
              </thead>
              <tbody>{
                _.map(this.state.usrswithsels, (u) => { return (<tr key={u.name}><td>{u.name} <input type="checkbox" data-selkey={u.name} checked={!!u.selected} onChange={this.checkUncheck}/></td><td>{u.uidNumber}</td></tr>) })
              }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }
}


export default function Groups(props) {
  let reponame = props.reponame;
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame } } });
  const [ toggleGrpMutation] = useMutation(TOGGLE_GROUPMEMBERSHIP_MUTATION);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  let repodata = data.repos[0], logged_in_user=data.whoami["username"];
  console.log(repodata);
  let leaders = _.get(repodata, "leaders", []), principal = _.get(repodata, "principal"), amILeader = _.includes(leaders, logged_in_user) || principal==logged_in_user;


  let toggleUserMembershipForGroup = function(username, groupname) {
    toggleGrpMutation({ variables: { reposinput: { name: reponame }, user: { username: username }, group: { name: groupname } }, refetchQueries: [ REPODETAILS, 'Repos' ], onError: (error) => { console.log("Error when toggling role " + error); } });
  }

  return (<GroupsTab groups={repodata.accessGroupObjs} allUsers={repodata.allUsers} amILeader={amILeader}
    showModal={props.showModal} setShowModal={props.setShowModal}
    onSelDesel={toggleUserMembershipForGroup} reponame={repodata.name}/>);
}
