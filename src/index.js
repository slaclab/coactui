import _ from "lodash";
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  gql
} from "@apollo/client";
import Col from "react-bootstrap/Col";
import Container from 'react-bootstrap/Container';
import Image from 'react-bootstrap/Image'
import Row from "react-bootstrap/Row";
import TopNavBar from "./nav";
import Facilities from "./tabs/facilities";
import Facility from "./tabs/facility";
import RepoTabs from "./tabs/repostabs";
import RequestTypes from "./tabs/requesttypes";
import Requests from "./tabs/requests";
import MyProfile from "./myprofile";
import RegisterUser from "./register";
import Repo from "./tabs/repo";
import Compute from "./tabs/compute";
import Storage from "./tabs/storage";
import Users from "./tabs/users";
import Groups from "./tabs/groups";
import ClustersTabs from "./tabs/clusterstabs";
import StorageTabs from "./tabs/storagetabs";
import './index.css';
import { Footer } from "./tabs/widgets";


const client = new ApolloClient({
  uri: process.env.REACT_APP_COACT_GRAPHQL_URI,
  cache: new InMemoryCache(),
  headers: { coactimp: localStorage.getItem('imptk') }
});

const container = document.getElementById('root');
const root = createRoot(container);

const HOMEDETAILS = gql`
query {
  amIRegistered {
    isRegistered
    isRegistrationPending
    eppn
    fullname
  }
}
`;

function App() {
  const { loading, error, data } = useQuery(HOMEDETAILS, { errorPolicy: 'all'} );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  console.log(data);
  let hasUserAcc = _.get(data, "amIRegistered.isRegistered", false);
  let eppn = _.get(data, "amIRegistered.eppn", null);
  let registrationPending = _.get(data, "amIRegistered.isRegistrationPending", false);
  let fullname = _.get(data, "amIRegistered.fullname", "");

  if (!hasUserAcc) {
    return (
      <BrowserRouter>
      <Routes>
        <Route exact path="/" element={ <Navigate to="register" replace />  } />
        <Route exact path="register" element={<RegisterUser eppn={eppn} registrationPending={registrationPending} fullname={fullname}/>}/>
      </Routes>
      </BrowserRouter>
    )
  }

  return (
    <div id="mainContainer">
      <div className="header">
        <BrowserRouter>
        <TopNavBar/>
        <Routes>
          <Route exact path="/" element={ <Navigate to="myprofile" /> } />
          <Route exact path="facilities" element={<Facilities />}/>
          <Route exact path="facilities/:facilityname" element={<Facility />}/>
          <Route exact path="repos" element={<RepoTabs />}/>
          <Route exact path="myprofile" element={<MyProfile />}/>
          <Route exact path="requests" element={<RequestTypes/>}/>
          <Route exact path="repos/:name" element={<Repo />}>
          <Route exact path="users/" element={<Users />} />
          <Route exact path="groups/" element={<Groups />} />
          </Route>
          <Route exact path="repousage/:reponame/compute/:allocationid" element={<Compute />} />
          <Route exact path="repousage/:reponame/storage/:allocationid" element={<Storage />} />
          <Route exact path="clusterusage/:clustername" element={<ClustersTabs />} />
          <Route exact path="storageusage/:storagename" element={<StorageTabs />} />
          <Route exact path="storageusage/:storagename/purpose/:purpose" element={<StorageTabs />} />
        </Routes>
        </BrowserRouter>
      </div>
      <Footer/>
    </div>
  );
}


root.render(
  <ApolloProvider client={client}>
    <App/>
  </ApolloProvider>
);
