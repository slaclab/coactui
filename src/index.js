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
import TopNavBar from "./nav";
import Facilities from "./tabs/facilities";
import Repos from "./tabs/repos";
import Requests from "./tabs/requests";
import Home from "./home";
import NewUser from "./newuser";
import Repo from "./tabs/repo";
import Compute from "./tabs/compute";
import Storage from "./tabs/storage";
import Users from "./tabs/users";
import Groups from "./tabs/groups";
import 'bootstrap/dist/css/bootstrap.css';
import './index.css';

const client = new ApolloClient({
  uri: process.env.REACT_APP_COACT_GRAPHQL_URI,
  cache: new InMemoryCache()
});

const container = document.getElementById('root');
const root = createRoot(container);

const HOMEDETAILS = gql`
query {
  amIRegistered {
    isRegistered
    isRegistrationPending
    eppn
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

  if (!hasUserAcc) {
    return (
      <BrowserRouter>
      <Routes>
        <Route exact path="/" element={ <Navigate to="newuser" replace />  } />
        <Route exact path="newuser" element={<NewUser eppn={eppn} registrationPending={registrationPending} />}/>
      </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
    <TopNavBar/>
    <Routes>
      <Route exact path="/" element={ <Navigate to="repos" /> } />
      <Route exact path="facilities" element={<Facilities />}/>
      <Route exact path="repos" element={<Repos />}/>
      <Route exact path="home" element={<Home />}/>
      <Route exact path="requests" element={<Requests />}/>
      <Route exact path="repos/:name" element={<Repo />}>
      <Route exact path="compute/:resourcename" element={<Compute />} />
      <Route exact path="storage/:resourcename" element={<Storage />} />
      <Route exact path="users/" element={<Users />} />
      <Route exact path="groups/" element={<Groups />} />
      </Route>
    </Routes>
    </BrowserRouter>
  );
}


root.render(
  <ApolloProvider client={client}>
    <App/>
  </ApolloProvider>
);
