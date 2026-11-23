import React, { Component } from 'react';
import Land from "../artifacts/Land.json";
import getWeb3 from "../getWeb3";
import { DrizzleProvider } from 'drizzle-react';
import { Spinner  } from 'react-bootstrap';
import {
  LoadingContainer,
  AccountData,
  ContractData,
  ContractForm
} from 'drizzle-react-components';
import "../index.css";

// reactstrap components
import {
  Button,
  ButtonGroup,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  Label,
  FormGroup,
  Input,
  Table,
  Row,
  Col,
  UncontrolledTooltip,
} from "reactstrap";


const drizzleOptions = {
  contracts: [Land]
}

var verified;
var row = [];
var rowsIpfs = [];

class viewImage extends Component {
  constructor(props) {
    super(props)

    this.state = {
      LandInstance: undefined,
      account: null,
      web3: null,
      flag: null,
      verified: '',
      registered: '',
      count: 0,
      id: '',
    }
  }

  viewImage = (landId) => {
    alert(landId);
    this.props.history.push({
        pathname: '/viewImage',
      })
}

  componentDidMount = async () => {
    //For refreshing page only once
    if (!window.location.hash) {
      window.location = window.location + '#loaded';
      window.location.reload();
    }

    try {
      //Get network provider and web3 instance
      const web3 = await getWeb3();

      const accounts = await web3.eth.getAccounts();

      const networkId = await web3.eth.net.getId();
      const deployedNetwork = 
        Land.networks[networkId] || 
        Land.networks['5777'] || 
        Land.networks['1337'] || 
        Object.values(Land.networks || {})[0];

      if (!deployedNetwork || !deployedNetwork.address) {
        throw new Error("Smart contract address not found in build artifacts. Please deploy contracts to Ganache.");
      }

      const instance = new web3.eth.Contract(
        Land.abi,
        deployedNetwork.address,
      );

      const currentAddress = (await web3.currentProvider.selectedAddress) || accounts[0];
      console.log(currentAddress);

      var verified = false;
      if (currentAddress) {
        verified = await instance.methods.isVerified(currentAddress).call();
      }

      var count = await instance.methods.getLandsCount().call();
      count = parseInt(count);
      console.log(typeof (count));
      console.log(count);

      var rowsArea = [];
      var rowsCity = [];
      var rowsState = [];
      var rowsSt = [];
      var rowsPrice = [];
      var rowsPID = [];
      var rowsSurvey = [];
      var rowsIpfs = [];
      var rowsDocs = [];

      for (var i = 1; i < count + 1; i++) {
        rowsArea.push(<ContractData contract="Land" method="getArea" methodArgs={[i]} />);
        rowsCity.push(<ContractData contract="Land" method="getCity" methodArgs={[i]} />);
        rowsState.push(<ContractData contract="Land" method="getState" methodArgs={[i]} />);
        rowsSt.push(<ContractData contract="Land" method="getStatus" methodArgs={[i]} />);
        rowsPrice.push(<ContractData contract="Land" method="getPrice" methodArgs={[i]} />);
        rowsPID.push(<ContractData contract="Land" method="getPID" methodArgs={[i]} />);
        rowsSurvey.push(<ContractData contract="Land" method="getSurveyNumber" methodArgs={[i]} />);
      }
      

      for (var i = 1; i < count + 1; i++) {
        var landImg = await instance.methods.getImage(i).call();
        rowsIpfs.push(landImg)
        var document = await instance.methods.getDocument(i).call();
        rowsDocs.push(document);
        row.push(<Col xs="6" key={i}>
     
        <div className="post-module">
          
          <div className="thumbnail">
            <div className="date">
            <div className="day">{i}</div>
            </div><img src={`https://ipfs.io/ipfs/${landImg}`} onError={(e) => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60"; }} alt="Land" />
          </div>
          
          <div className="post-content">
            <div className="category">Photos</div>
            <h1 className="title">{rowsArea[i-1]} Sq. m.</h1>
            <h2 className="sub_title">{rowsCity[i-1]}, {rowsState[i-1]}</h2>
            <p className="description">PID: {rowsPID[i-1]}<br/> Survey No.: {rowsSurvey[i-1]}</p>
      <div className="post-meta">
        <span className="timestamp">
          View Verified Land{" "}
          <a 
            href={`/view-document?cid=${document}&type=Land&landId=${i}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline-success"
            style={{ marginLeft: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "600" }}
          >
            📜 View 7/12 Extract
          </a>
        </span>
      </div>
          </div>
        </div>
      </Col>)
      }
      console.log(row);

      this.setState({ 
        LandInstance: instance, 
        web3: web3, 
        account: currentAddress, 
        verified: verified, 
        registered: true 
      });

      

    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  render() {
    if (!this.state.web3) {
      return (
        <div>
          <div>
            <h1>
              <Spinner animation="border" variant="primary" />
            </h1>
          </div>

        </div>
      );
    }

    if (!this.state.registered || !this.state.verified) {
      return (
        <div className="content">
          <div>
            <Row>
              <Col xs="6">
                <Card>
                  <CardBody>
                    <h1>
                      You are not verified to view this page
                                        </h1>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </div>

        </div>
      );
    }


    return (
      <>
        <div className="content">
          <DrizzleProvider options={drizzleOptions}>
            <LoadingContainer>

              <Row>

                {row}

              </Row>
            </LoadingContainer>
          </DrizzleProvider>
          
        </div>
      </>

    );

  }
}

export default viewImage;