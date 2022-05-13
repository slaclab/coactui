import _ from "lodash";
import { NavLink } from "react-router-dom";
import { useQuery, gql } from "@apollo/client";

const REPOS = gql`
query{
  myRepos {
    name
    principal
    facilityObj {
      name
    }
  }
}`;

export default function Repos() {
  const { loading, error, data } = useQuery(REPOS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  let repos = data.myRepos;
  return (
    <div className="container-fluid text-center table-responsive">
      <table className="table table-condensed table-striped table-bordered">
        <thead><tr><th>Name</th><th>Facility</th><th>PI</th><th>Total compute allocation</th><th>Total compute used</th><th>Total storage allocation</th><th>Total storage used</th></tr></thead>
        <tbody>{
          _.map(repos, (r) => { return (
            <tr key={r.name} data-name={r.name}>
              <td><NavLink to={`/repos/${r.name}`} key={r.name}>{r.name}</NavLink></td>
              <td>{r.facilityObj.name}</td>
              <td>{r.principal}</td>
              <td>TBD</td>
              <td>TBD</td>
              <td>TBD</td>
              <td>TBD</td>
            </tr>
          )})
        }
        </tbody>
      </table>
    </div>
  );
}
