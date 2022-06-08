import React from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import Button from 'react-bootstrap/Button';
import _ from "lodash";

const FACILITYDETAILS = gql`
query {
  facilities {
    name
    description
  }
}
`;


export default function Facilities() {
  const { loading, error, data } = useQuery(FACILITYDETAILS, { errorPolicy: 'all'} );

  if (loading) return <p>Loading...</p>;
//  if (error) return <p>Error :</p>;

	  console.log(data);
  let facilities = data.facilities;
  return (
     <div className="container-fluid text-center" id="users_content">
         <div className="table-responsive">
           <table className="table table-condensed table-striped table-bordered collabtbl">
             <thead>
               <tr>
                 <th>Faclity</th>
                 <th>Description</th>
                 <th>Czars</th>
                 <th>Created</th>
                 <th>Updated</th>
               </tr>
             </thead>
             <tbody>{
               _.map(facilities, (f) => { return(
                 <tr key={f.name} data-name={f.name}>
		   <td>{f.name}</td>
		   <td>{f.description}</td>
		   <td>{f.czars}</td>
		   <td>TBD</td>
		   <td>TBD</td>
		 </tr>
	       ) } )
	     }</tbody>
           </table>
         </div>
      </div>
  );
}
