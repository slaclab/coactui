import React from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import Button from 'react-bootstrap/Button';
import _ from "lodash";

const HOMEDETAILS = gql`
query {
  whoami {
    username
    uidnumber
  }
}
`;
class TopTab extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div className="toptbl">
        <div className="row">
          <span className="col-2"><label>Username</label></span>
          <span className="col-2"><p>{this.props.username}</p></span>
          <span className="col-2"><label>uid number</label></span>
          <span className="col-2"><p>{this.props.uid}</p></span>
        </div>
      </div>
    );
  }
}

export default function Home() {
  const { loading, error, data } = useQuery(HOMEDETAILS, { errorPolicy: 'all'} );

  if (loading) return <p>Loading...</p>;
//  if (error) return <p>Error :</p>;

	  console.log(data);
  let username = data["whoami"].username;
  let uid = data["whoami"].uidnumber;
  return (
    <TopTab username={username} uid={uid}/>
  );
}
