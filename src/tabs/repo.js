import _ from "lodash";
import { useState } from 'react';
import { useParams } from "react-router-dom";
import { Link, Outlet } from "react-router-dom";
import { useQuery, gql } from "@apollo/client";
import Container from 'react-bootstrap/Container';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Nav from 'react-bootstrap/Nav';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from 'react-bootstrap/Button';
import Users from "./users";
import Groups from "./groups";

const REPODETAILS = gql`
query Repos($reposinput: RepoInput){
  repos(filter:$reposinput) {
    name
    principal
    leaders
  }
  whoami {
    username
  }
}`;

export default function Repo() {
  let params = useParams(), reponame = params.name;
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame } } });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [activeTab, setActiveTab] = useState("users");


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


  return (<Tab.Container defaultActiveKey="users">
    <Row id="repoinfotabs">
      <Col>
        <Nav variant="tabs">
          <Nav.Item>
            <Nav.Link eventKey="users">Users</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="groups">Groups</Nav.Link>
          </Nav.Item>
        </Nav>
        </Col>
        <Col>
          <div className="sectiontitle">Users and groups for <span className="ref">{reponame}</span></div>
        </Col>
        <Col md={2}>
          <span className="float-end me-1">
            <Button variant="secondary" className={amILeader && activeTab=="users" ? "" : "d-none"} onClick={() => { setShowAddUserModal(true)} }>Add user to repo</Button>
            <Button variant="secondary" className={amILeader && activeTab=="groups"? "" : "d-none"} onClick={() => { setShowAddGroupModal(true)} }>Create new access group</Button>
          </span>
        </Col>
    </Row>
    <Tab.Content>
      <Tab.Pane eventKey="users" onEnter={() => setActiveTab("users")}>
        <Users reponame={reponame} showModal={showAddUserModal} setShowModal={setShowAddUserModal} />
      </Tab.Pane>
      <Tab.Pane eventKey="groups" onEnter={() => setActiveTab("groups")}>
        <Groups reponame={reponame} showModal={showAddGroupModal} setShowModal={setShowAddGroupModal}/>
      </Tab.Pane>
    </Tab.Content>
  </Tab.Container>
  );
}
