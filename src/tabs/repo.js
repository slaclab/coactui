import _ from "lodash";
import { useParams } from "react-router-dom";
import { Link, Outlet } from "react-router-dom";
import { useQuery, gql } from "@apollo/client";
import Container from 'react-bootstrap/Container';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Nav from 'react-bootstrap/Nav';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Users from "./users";
import Groups from "./groups";

const REPODETAILS = gql`
query Repos($reposinput: RepoInput){
  repos(filter:$reposinput) {
    name
    facility
    facilityObj {
      name
      resources
    }
  }
}`;

export default function Repo() {
  let params = useParams(), reponame = params.name;
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame } } });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  let repodata = data.repos[0], resources = _.get(repodata, "facilityObj.resources", []), facility = repodata.facility;
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
    </Row>
    <Tab.Content>
      <Tab.Pane eventKey="users">
        <Users reponame={reponame}/>
      </Tab.Pane>
      <Tab.Pane eventKey="groups">
      <Groups reponame={reponame}/>
      </Tab.Pane>
    </Tab.Content>
  </Tab.Container>
  );
}
