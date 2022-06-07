import _ from "lodash";
import { useParams } from "react-router-dom";
import { Link, Outlet } from "react-router-dom";
import { useQuery, gql } from "@apollo/client";
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

const REPODETAILS = gql`
query Repos($reposinput: RepoInput){
  repos(filter:$reposinput) {
    name
    facility
    facilityObj {
      name
      resources {
        name
        type
      }
    }
  }
}`;

export default function Repo() {
  let params = useParams(), reponame = params.name;
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame } } });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  let repodata = data.repos[0], resources = _.get(repodata, "facilityObj.resources", []), facility = repodata.facility;
  return (<div>
    <Navbar bg="light" expand="lg">
      <Container>
        <Navbar.Brand>{facility} / {reponame}</Navbar.Brand>
        <Navbar.Collapse>
          <Nav className="me-auto" navbar>
          { resources.map((resource) => (
            <Nav.Item key={resource.name}>
              <Nav.Link as={Link} to={`/repos/${reponame}/${resource.type}/${resource.name}`}>
                {resource.name}
              </Nav.Link>
            </Nav.Item>
          ))}
          <Nav.Item key="users"><Nav.Link as={Link} to={`/repos/${reponame}/users/`}>Users</Nav.Link></Nav.Item>
          <Nav.Item key="groups"><Nav.Link as={Link} to={`/repos/${reponame}/groups/`}>Groups</Nav.Link></Nav.Item>
          </Nav>
      </Navbar.Collapse>
      </Container>
    </Navbar>
    <div>
      <Outlet />
    </div>
  </div>);
}
