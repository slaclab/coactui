import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import dayjs from "dayjs";
import _ from "lodash";

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
}
`;

const TOGGLE_GROUPMEMBERSHIP_MUTATION = gql`
mutation ToggleUserRole($reposinput: RepoInput!, $user: UserInput!, $group: AccessGroupInput!){
  toggleGroupMembership(repo: $reposinput, user: $user, group: $group){
    name
  }
}
`;

class GroupsTab extends React.Component {
  constructor(props) {
    super(props);
    this.state = { selectedGroup: "", usrswithsels: [] }
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
  }

  render() {
    return (
      <div className="container-fluid text-center tabcontainer">
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


export default function Groups() {
  let params = useParams(), reponame = params.name, resourcename = params.resourcename, datayear = dayjs().year();
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame }, resourcename: resourcename, datayear: datayear } });
  const [ toggleGrpMutation] = useMutation(TOGGLE_GROUPMEMBERSHIP_MUTATION);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  let repodata = data.repos[0];
  console.log(repodata);

  let toggleUserMembershipForGroup = function(username, groupname) {
    toggleGrpMutation({ variables: { reposinput: { name: reponame }, user: { username: username }, group: { name: groupname } }, refetchQueries: [ REPODETAILS, 'Repos' ], onError: (error) => { console.log("Error when toggling role " + error); } });
  }

  return (<GroupsTab groups={repodata.accessGroupObjs} allUsers={repodata.allUsers} onSelDesel={toggleUserMembershipForGroup}/>);
}
