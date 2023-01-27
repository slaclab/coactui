import React, { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { Link, useParams, useOutletContext } from "react-router-dom";
import { SearchAndAdd } from "./widgets";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import ModalHeader from 'react-bootstrap/ModalHeader';
import ModalBody from 'react-bootstrap/ModalBody';
import ModalFooter from 'react-bootstrap/ModalFooter';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { faPersonArrowUpFromLine, faPersonArrowDownToLine } from '@fortawesome/free-solid-svg-icons'
import _ from "lodash";

const REPODETAILS = gql`
query Repos($reposinput: RepoInput){
  repos(filter:$reposinput) {
    name
    facility
    principal
    leaders
    users
    allUsers {
      Id
      username
      uidnumber
      eppnObjs {
        eppn
        fullname
        organization
      }
    }
  }
  whoami {
    username
  }
  users(filter:{}){
    username
  }
}
`;

const TOGGLE_ROLE_MUTATION = gql`
mutation ToggleUserRole($reposinput: RepoInput!, $user: UserInput!){
  repoToggleUserRole(repo: $reposinput, user: $user){
    name
    leaders
  }
}
`;

const ADD_USER_MUTATION = gql`
mutation AddUserToRepo($reposinput: RepoInput!, $user: UserInput!) {
  repoAddUser(repo: $reposinput, user: $user) {
    name
  }
}
`;

const REMOVE_USER_MUTATION = gql`
mutation AddUserToRepo($reposinput: RepoInput!, $user: UserInput!) {
  repoRemoveUser(repo: $reposinput, user: $user) {
    name
  }
}
`;


class Eppn extends React.Component {
  render() {
    return _.map(_.get(this.props.user, "eppnObjs", []), (e) => {
      return(
        <div key={e.fullname} className="row">
          <span className="col-4">{e.eppn}</span>
          <span className="col-4">{e.fullname}</span>
          <span className="col-4">{e.organization}</span>
        </div>
      )
    })
  }
}

class ManageRoleAction extends React.Component {
  constructor(props) {
    super(props);
    let user = this.props.user;
    this.state = { is_leader: user.is_leader, maximal_role: user.maximal_role }

    this.handleRoleChange = (event) => {
      let donefn = (data) => {
        console.log("Done function...");
        let leaders = _.get(data, "repoToggleUserRole.leaders", []);
        let is_leader = _.includes(leaders, user.username);
        let maximal_role = is_leader ? "Leader" : "User";
        this.setState({ is_leader: is_leader, maximal_role: maximal_role })
      }
      this.props.onToggleRole(user.username, donefn);
    }
  }

  render() {
    let user = this.props.user;
    var act = (<span/>);
    if(user.has_manage_roles) {
      if(this.state.is_leader) {
        act = (<span className="inlntlbr select_role px-2 text-warning" title="Remove the leader role for this user" onClick={this.handleRoleChange}><FontAwesomeIcon icon={faPersonArrowDownToLine}/></span>)
      } else {
        act = (<span className="inlntlbr select_role px-2 text-warning" title="Add the leader role to this user" onClick={this.handleRoleChange}><FontAwesomeIcon icon={faPersonArrowUpFromLine}/></span>)
      }
    }
    return (
      <span>{user.is_pi ? "PI" : this.state.maximal_role}
        <span>{user.is_pi ? "" : act}</span>
      </span>
    )
  }
}

class UsersTab extends React.Component {
  constructor(props) {
    super(props);
    this.hideModal = () => {
      this.props.setShowModal(false);
    }
  }

  componentDidMount() {
    if(this.props.amILeader) {
      this.props.setToolbaritems(oldItems => [...oldItems, ["Add user to repo", this.props.setShowModal]]);
    }
  }

  componentWillUnmount() {
    this.props.setToolbaritems(oldItems => _.filter(oldItems, (x) => { return x[0] != "Add user to repo" }));
  }

  render() {
    return (
      <div className="container-fluid tabcontainer">
        <Modal show={this.props.showModal}>
            <ModalHeader>
              Search for users and add/remove them to/from this repo.
            </ModalHeader>
            <ModalBody>
              <SearchAndAdd label="Username" alloptions={this.props.allusernames} selected={_.map(this.props.users, "username")} onSelDesel={this.props.onSelDesel}/>
            </ModalBody>
            <ModalFooter>
              <Button onClick={this.hideModal}>
                Done
              </Button>
            </ModalFooter>
          </Modal>
          <div className="container-fluid" id="users_content">
            <Row>
              <Col><div className="brdcrmb"><Link to={"../users"}>Users</Link> / {this.props.repodata.name}</div></Col>
              <Col><div className="sectiontitle">Users for repo <span className="ref">{this.props.repodata.name}</span></div></Col>
              <Col className="mb-2">
              </Col>
            </Row>
            <div className="table-responsive">
              <table className="table table-condensed table-striped table-bordered collabtbl">
                <thead>
                  <tr>
                    <th>Userid</th>
                    <th>Role</th>
                    <th colSpan="3">
                      <div className="row">
                        <span className="col-4">Username</span>
                        <span className="col-4">User email</span>
                        <span className="col-4">Organization</span>
                      </div>
                    </th>
                    <th>Account state</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                {_.map(this.props.users, (user) => {
                  return (<tr key={user.username}>
                    <td>{user.username}</td>
                    <td className="manage_roles"><ManageRoleAction user={user} onToggleRole={this.props.onToggleRole}/></td>
                    <td colSpan="3"><Eppn user={user}/></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>)})}
                </tbody>
              </table>
            </div>
          </div>
       </div>
    );
  }
}


export default function Users(props) {
  let params = useParams(), reponame = params.name;
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame } } });

  const [ toggleRoleMutation ] = useMutation(TOGGLE_ROLE_MUTATION);
  const [ addUserMutation ] = useMutation(ADD_USER_MUTATION);
  const [ removeUserMutation ] = useMutation(REMOVE_USER_MUTATION);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [ toolbaritems, setToolbaritems ] = useOutletContext();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  let repodata = data.repos[0], logged_in_user=data.whoami["username"];
  console.log(repodata);

  let leaders = _.get(repodata, "leaders", []), allusers = _.cloneDeep(_.get(repodata, "allUsers", [])), principal = _.get(repodata, "principal"), allusernames = _.map(_.get(data, "users"), "username");
  let has_manage_roles_privilege = _.includes(_.concat(leaders, [principal]), logged_in_user);
  _.each(allusers, x => {
    x["is_pi"] = x["username"] === principal;
    x["is_leader"] = _.includes(leaders, x["username"]);
    x["maximal_role"] = x["is_leader"] ? "Leader" : "User";
    x["has_manage_roles"] = has_manage_roles_privilege;
  });
  console.log(allusers);
  let amILeader = _.includes(leaders, logged_in_user) || principal==logged_in_user;

  let toggleRole = function(username, callWhenDone) {
    console.log("Toggling role for user " + username);
    toggleRoleMutation({ variables: { reposinput: { name: reponame }, user: { username: username } }, onCompleted: callWhenDone, onError: (error) => { console.log("Error when toggling role " + error); } });
  }

  let addRemoveUser = function(username, selected) {
    if(selected) {
      console.log("Adding user " + username + " to the repo " + reponame);
      addUserMutation({ variables: { reposinput: { name: reponame }, user: { username: username } }, refetchQueries: [ REPODETAILS, 'Repos' ], onError: (error) => { console.log("Error when toggling role " + error); } });
    } else {
      console.log("Removing user " + username + " from the repo " + reponame);
      removeUserMutation({ variables: { reposinput: { name: reponame }, user: { username: username } }, refetchQueries: [ REPODETAILS, 'Repos' ], onError: (error) => { console.log("Error when toggling role " + error); } });
    }
  }

  return (<UsersTab repodata={repodata} users={allusers} allusernames={allusernames}
    onToggleRole={toggleRole} onSelDesel={addRemoveUser} amILeader={amILeader}
    showModal={showAddUserModal} setShowModal={setShowAddUserModal}
    toolbaritems={toolbaritems} setToolbaritems={setToolbaritems}
    />);
}
