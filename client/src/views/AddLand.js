import React, { Component } from 'react';
import LandContract from "../artifacts/Land.json";
import getWeb3 from "../getWeb3";
import ipfs from '../ipfs';
import { Link } from 'react-router-dom';

import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  FormGroup,
  Form,
  Input,
  Row,
  Col,
  Alert,
  Badge,
} from "reactstrap";
import { Spinner } from 'react-bootstrap';
import '../../node_modules/bootstrap/dist/css/bootstrap.min.css';

class AddLand extends Component {
  constructor(props) {
    super(props);

    this.state = {
      LandInstance: undefined,
      account: null,
      web3: null,
      area: '',
      city: '',
      stateLoc: '',
      price: '',
      propertyPID: '',
      surveyNum: '',
      verified: false,
      registered: false,
      buffer: null,
      ipfsHash: '',
      buffer2: null,
      isSubmitting: false,
      registrationSuccess: false,
      registeredLandId: null,
      registeredTxHash: '',
      copiedTx: false,
    };
    this.captureFile = this.captureFile.bind(this);
    this.captureDoc = this.captureDoc.bind(this);
  }

  resetForm = () => {
    this.setState({
      area: '',
      city: '',
      stateLoc: '',
      price: '',
      propertyPID: '',
      surveyNum: '',
      buffer: null,
      ipfsHash: '',
      buffer2: null,
      document: '',
      isSubmitting: false,
      registrationSuccess: false,
      registeredLandId: null,
      registeredTxHash: '',
      copiedTx: false,
    });
  };

  copyTxHash = () => {
    if (navigator.clipboard && this.state.registeredTxHash) {
      navigator.clipboard.writeText(this.state.registeredTxHash);
      this.setState({ copiedTx: true });
      setTimeout(() => this.setState({ copiedTx: false }), 2000);
    }
  };

  componentDidMount = async () => {
    try {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();
      const deployedNetwork =
        LandContract.networks[networkId] ||
        LandContract.networks['5777'] ||
        LandContract.networks['1337'] ||
        Object.values(LandContract.networks || {})[0];

      if (!deployedNetwork || !deployedNetwork.address) {
        throw new Error("Smart contract address not found in build artifacts.");
      }

      const instance = new web3.eth.Contract(
        LandContract.abi,
        deployedNetwork.address,
      );

      const currentAddress = (web3.currentProvider && web3.currentProvider.selectedAddress) || accounts[0];

      let verified = false;
      let registered = false;
      if (currentAddress) {
        verified = await instance.methods.isVerified(currentAddress).call();
        registered = await instance.methods.isRegistered(currentAddress).call();
      }

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }

      this.setState({
        LandInstance: instance,
        web3: web3,
        account: currentAddress,
        verified: verified,
        registered: registered,
      });

    } catch (error) {
      console.error(error);
      alert(`Failed to load web3, accounts, or contract.`);
    }
  };

  populateSampleLand = () => {
    this.setState({
      area: '2400',
      city: 'Pune',
      stateLoc: 'Maharashtra',
      price: '5500000',
      propertyPID: '884102',
      surveyNum: '45/2B',
      ipfsHash: 'QmSampleLandImage',
      document: 'QmSample712Extract',
    });
  };

  captureFile(event) {
    event.preventDefault();
    const file = event.target.files[0];
    if (file) {
      const reader = new window.FileReader();
      reader.readAsArrayBuffer(file);
      reader.onloadend = () => {
        this.setState({ buffer: Buffer(reader.result), ipfsHash: 'QmLandImg' + Date.now() });
      };
    }
  }

  captureDoc(event) {
    event.preventDefault();
    const file = event.target.files[0];
    if (file) {
      const reader = new window.FileReader();
      reader.readAsArrayBuffer(file);
      reader.onloadend = () => {
        const docHash = 'Qm712Doc' + Date.now();
        this.setState({ buffer2: Buffer(reader.result), document: docHash });

        // Save data URL to localStorage for instantaneous preview in DocumentViewer
        const urlReader = new FileReader();
        urlReader.onload = (e) => {
          try {
            localStorage.setItem('ipfs_doc_' + docHash, e.target.result);
          } catch (storageErr) {
            console.warn(storageErr);
          }
        };
        urlReader.readAsDataURL(file);
      };
    }
  }

  addLand = async (e) => {
    e && e.preventDefault();
    const { area, city, stateLoc, price, propertyPID, surveyNum, LandInstance, account, verified, registered } = this.state;

    if (!registered) {
      alert("Please complete User Registration first.");
      return;
    }

    if (!verified) {
      alert("Only KYC-verified Users can register land. Your account is currently pending government Land Inspector approval.");
      return;
    }

    if (!area || !city || !stateLoc || !price || !propertyPID || !surveyNum) {
      alert("All fields are required!");
      return;
    }

    const ipfsImg = this.state.ipfsHash || 'QmSampleLandImage';
    const ipfsDoc = this.state.document || 'QmSample712Extract';

    this.setState({ isSubmitting: true });

    try {
      const tx = await LandInstance.methods.addLand(
        area,
        city,
        stateLoc,
        price,
        propertyPID,
        surveyNum,
        ipfsImg,
        ipfsDoc
      ).send({
        from: account,
        gas: 2100000
      });

      let landId = null;
      if (tx.events && tx.events.AddingLand && tx.events.AddingLand.returnValues) {
        landId = tx.events.AddingLand.returnValues._landId;
      }
      if (!landId) {
        landId = await LandInstance.methods.getLandsCount().call();
      }

      this.setState({
        isSubmitting: false,
        registrationSuccess: true,
        registeredLandId: landId,
        registeredTxHash: tx.transactionHash,
      });
    } catch (err) {
      console.error(err);
      alert("Transaction failed: " + (err.message || err));
      this.setState({ isSubmitting: false });
    }
  };

  render() {
    const { 
      web3, 
      registered, 
      verified, 
      isSubmitting, 
      registrationSuccess, 
      registeredLandId, 
      registeredTxHash, 
      copiedTx,
      area,
      city,
      stateLoc,
      price,
      propertyPID,
      surveyNum
    } = this.state;

    if (!web3) {
      return (
        <div className="content text-center" style={{ paddingTop: "120px" }}>
          <Spinner animation="border" variant="primary" />
          <h4 className="mt-3 text-muted">Connecting to Ethereum Network...</h4>
        </div>
      );
    }

    return (
      <div className="content">
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <CardTitle tag="h3" style={{ fontWeight: "bold", margin: 0 }}>
                      📝 Register New Land Parcel
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardBody>
                {registrationSuccess ? (
                  <div style={{ padding: "20px 10px", textAlign: "center" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#d1fae5", color: "#059669", fontSize: "32px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
                      ✓
                    </div>
                    <h3 style={{ fontWeight: 800, color: "#065f46", marginBottom: "8px" }}>
                      Property Registered on Blockchain!
                    </h3>
                    <p style={{ color: "#64748b", fontSize: "14px", maxWidth: "550px", margin: "0 auto 20px auto" }}>
                      Your land registration transaction has been successfully confirmed and permanently stored on the Ethereum ledger.
                    </p>

                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 24px", maxWidth: "600px", margin: "0 auto 24px auto", textAlign: "left" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                        <span style={{ color: "#64748b", fontSize: "13px" }}>Unique Property ID:</span>
                        <strong style={{ color: "#2563eb", fontSize: "16px" }}>#{registeredLandId}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                        <span style={{ color: "#64748b", fontSize: "13px" }}>Survey Number:</span>
                        <strong style={{ color: "#0f172a", fontSize: "14px" }}>{surveyNum}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                        <span style={{ color: "#64748b", fontSize: "13px" }}>Property PID:</span>
                        <strong style={{ color: "#0f172a", fontSize: "14px" }}>{propertyPID}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                        <span style={{ color: "#64748b", fontSize: "13px" }}>Location:</span>
                        <strong style={{ color: "#0f172a", fontSize: "14px" }}>{city}, {stateLoc}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                        <span style={{ color: "#64748b", fontSize: "13px" }}>Area & Price:</span>
                        <strong style={{ color: "#0f172a", fontSize: "14px" }}>{area} Sq Ft (₹ {price})</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                        <span style={{ color: "#64748b", fontSize: "13px" }}>Government Status:</span>
                        <Badge color="warning" style={{ fontSize: "11.5px" }}>⏳ Pending Land Inspector Verification</Badge>
                      </div>
                      <div style={{ marginTop: "12px" }}>
                        <span style={{ color: "#64748b", fontSize: "12px", display: "block", marginBottom: "4px" }}>Blockchain Transaction Hash:</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <code style={{ fontSize: "11.5px", background: "#e2e8f0", padding: "6px 10px", borderRadius: "6px", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {registeredTxHash}
                          </code>
                          <Button color="secondary" size="sm" onClick={this.copyTxHash} style={{ fontSize: "11px", padding: "5px 10px" }}>
                            {copiedTx ? "Copied!" : "Copy"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
                      <Link to="/User/MyLands" className="btn btn-success" style={{ fontWeight: "700", padding: "10px 22px" }}>
                        View in My Properties (Sell) →
                      </Link>
                      <Button color="primary" outline onClick={this.resetForm} style={{ fontWeight: "700", padding: "10px 22px" }}>
                        ➕ Register Another Property
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {!registered ? (
                      <Alert color="warning">
                        ⚠️ You must complete <Link to="/RegisterUser">User Registration</Link> before adding land.
                      </Alert>
                    ) : !verified ? (
                      <Alert color="warning">
                        ⏳ <strong>Verification Pending:</strong> Your User KYC is undergoing Land Inspector review. You can prepare your details, but submission requires verified status.
                      </Alert>
                    ) : null}

                <Form onSubmit={this.addLand}>
                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <label>Physical Survey Number *</label>
                        <Input
                          type="text"
                          placeholder="e.g. 112/4B or 45"
                          value={this.state.surveyNum}
                          onChange={(e) => this.setState({ surveyNum: e.target.value })}
                          required
                        />
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label>Property Identification Number (PID) *</label>
                        <Input
                          type="number"
                          placeholder="e.g. 204560"
                          value={this.state.propertyPID}
                          onChange={(e) => this.setState({ propertyPID: e.target.value })}
                          required
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="4">
                      <FormGroup>
                        <label>Area (in Square Feet) *</label>
                        <Input
                          type="number"
                          placeholder="e.g. 2400"
                          value={this.state.area}
                          onChange={(e) => this.setState({ area: e.target.value })}
                          required
                        />
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <label>City / Taluka *</label>
                        <Input
                          type="text"
                          placeholder="e.g. Pune"
                          value={this.state.city}
                          onChange={(e) => this.setState({ city: e.target.value })}
                          required
                        />
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <label>State *</label>
                        <Input
                          type="text"
                          placeholder="e.g. Maharashtra"
                          value={this.state.stateLoc}
                          onChange={(e) => this.setState({ stateLoc: e.target.value })}
                          required
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="6">
                      <FormGroup>
                        <label>Asking / Market Price (in ₹) *</label>
                        <Input
                          type="number"
                          placeholder="e.g. 5000000"
                          value={this.state.price}
                          onChange={(e) => this.setState({ price: e.target.value })}
                          required
                        />
                        {this.state.price && (
                          <small className="text-muted">
                            Equivalent: ~{(parseFloat(this.state.price) * 0.0000057).toFixed(5)} ETH
                          </small>
                        )}
                      </FormGroup>
                    </Col>

                    <Col md="6">
                      <FormGroup>
                        <label style={{ fontWeight: 700, fontSize: "12.5px", color: "#334155" }}>
                          📄 Upload 7/12 Extract / Ownership Proof (PDF) *
                        </label>
                        <div style={{
                          border: "2px dashed #cbd5e1",
                          borderRadius: "10px",
                          padding: "14px 16px",
                          background: "#f8fafc"
                        }}>
                          <Input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={this.captureDoc}
                            style={{ border: "none", background: "transparent", padding: 0 }}
                          />
                          <small className="text-muted d-block mt-1" style={{ fontSize: "12px" }}>
                            Official 7/12 Land Extract or Title Deed document.
                          </small>
                        </div>
                      </FormGroup>
                    </Col>
                  </Row>

                  <Button
                    color="primary"
                    type="submit"
                    disabled={isSubmitting || !verified}
                    style={{ fontWeight: "bold", padding: "12px 24px", marginTop: "10px" }}
                  >
                    {isSubmitting ? "Submitting to Blockchain..." : "🏛️ Register Land on Blockchain"}
                  </Button>
                </Form>
                </>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
}

export default AddLand;
