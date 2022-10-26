import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Requests from "../tabs/requests";

export default function RequestTypes() {
  return (<div id="requesttypes">
    <Tabs
      defaultActiveKey={"myrequests"}
      id="requests-tab"
      className="mb-3"
      mountOnEnter={true}
      unmountOnExit={true}
    >
      <Tab key={"myrequests"} eventKey={"myrequests"} title={"My Requests"}>
        <Requests showall={true} showmine={true}/>
      </Tab>
      <Tab key={"pendingrequests"} eventKey={"pendingrequests"} title={"Pending Requests"}>
        <Requests showall={false} showmine={false}/>
      </Tab>
      <Tab key={"allrequests"} eventKey={"allrequests"} title={"All Requests"}>
        <Requests showall={true} showmine={false}/>
      </Tab>
    </Tabs>
  </div>);
}
