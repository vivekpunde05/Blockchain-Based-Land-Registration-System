import React, { Component } from 'react';
import Land from "../artifacts/Land.json";
import getWeb3 from "../getWeb3";
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table,
  Row,
  Col,
  Badge,
  Alert,
  Spinner,
} from "reactstrap";
import "../card.css";
import "../index.css";

class UserDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      LandInstance: null,
      account: null,
      web3: null,
      loading: true,
      user: {
        name: '',
        age: '',
        city: '',
        aadharNumber: '',
        panNumber: '',
        document: '',
        email: '',
      },
      isRegistered: false,
      isVerified: false,
      isRejected: false,
      rejectionReason: '',
      myLandsCount: 0,
      marketplaceCount: 0,
      incomingRequestsCount: 0,
      sentRequestsCount: 0,
      myLands: [],
    };
  }

  componentDidMount = async () => {
    try {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const currentAddress = (web3.currentProvider && web3.currentProvider.selectedAddress) || accounts[0];

      const networkId = await web3.eth.net.getId();
      const deployedNetwork =
        Land.networks[networkId] ||
        Land.networks['5777'] ||
        Land.networks['1337'] ||
        Object.values(Land.networks || {})[0];

      if (!deployedNetwork || !deployedNetwork.address) {
        throw new Error("Smart contract not found on current network.");
      }

      const instance = new web3.eth.Contract(Land.abi, deployedNetwork.address);

      let isRegistered = false;
      let isVerified = false;
      let isRejected = false;
      let rejectionReason = '';
      let userDetails = { name: '', age: '', city: '', aadharNumber: '', panNumber: '', document: '', email: '' };

      if (currentAddress) {
        try {
          isRegistered = await instance.methods.isRegistered(currentAddress).call();
          isVerified = await instance.methods.isVerified(currentAddress).call();
          isRejected = await instance.methods.isRejected(currentAddress).call();
          if (instance.methods.UserRejectionReason) {
            rejectionReason = await instance.methods.UserRejectionReason(currentAddress).call();
          }

          if (isRegistered) {
            const data = await instance.methods.getUserDetails(currentAddress).call();
            userDetails = {
              name: data[0] || 'User',
              age: data[1],
              city: data[2],
              aadharNumber: data[3],
              panNumber: data[4],
              document: data[5],
              email: data[6],
            };
          }
        } catch (e) {
          console.warn("User details fetch error:", e);
        }
      }

      // Gather lands metrics
      const totalLands = parseInt(await instance.methods.getLandsCount().call() || 0);
      let myLands = [];
      let marketplaceCount = 0;

      for (let i = 1; i <= totalLands; i++) {
        try {
          const owner = await instance.methods.getLandOwner(i).call();
          const isLandVerif = await instance.methods.isLandVerified(i).call();
          const isOnSale = await instance.methods.isLandOnSale(i).call();
          const area = await instance.methods.getArea(i).call();
          const city = await instance.methods.getCity(i).call();
          const stateLoc = await instance.methods.getState(i).call();
          const price = await instance.methods.getPrice(i).call();
          const pid = await instance.methods.getPID(i).call();
          const survey = await instance.methods.getSurveyNumber(i).call();
          const doc = await instance.methods.getDocument(i).call();

          if (owner && currentAddress && owner.toLowerCase() === currentAddress.toLowerCase()) {
            myLands.push({
              id: i,
              area,
              city,
              state: stateLoc,
              price,
              pid,
              survey,
              doc,
              isLandVerif,
              isOnSale,
            });
          }

          if (isLandVerif && isOnSale) {
            marketplaceCount++;
          }
        } catch (landErr) {
          console.warn("Land fetch error at id:", i, landErr);
        }
      }

      // Gather requests metrics
      const totalReqs = parseInt(await instance.methods.getRequestsCount().call() || 0);
      let incomingRequestsCount = 0;
      let sentRequestsCount = 0;

      for (let r = 1; r <= totalReqs; r++) {
        try {
          const req = await instance.methods.getRequestDetails(r).call();
          const isReqActive = await instance.methods.isRequested(r).call();
          if (isReqActive) {
            if (currentAddress && req[0] && req[0].toLowerCase() === currentAddress.toLowerCase()) {
              incomingRequestsCount++;
            }
            if (currentAddress && req[1] && req[1].toLowerCase() === currentAddress.toLowerCase()) {
              sentRequestsCount++;
            }
          }
        } catch (reqErr) {
          console.warn("Req fetch error at id:", r, reqErr);
        }
      }

      this.setState({
        web3,
        account: currentAddress,
        LandInstance: instance,
        loading: false,
        user: userDetails,
        isRegistered,
        isVerified,
        isRejected,
        rejectionReason,
        myLands,
        myLandsCount: myLands.length,
        marketplaceCount,
        incomingRequestsCount,
        sentRequestsCount,
      });

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    } catch (err) {
      console.error("Dashboard mount error:", err);
      this.setState({ loading: false });
    }
  };

  render() {
    const { loading, account, user, isRegistered, isVerified, isRejected, rejectionReason, myLandsCount, marketplaceCount, incomingRequestsCount, sentRequestsCount, myLands } = this.state;

    if (loading) {
      return (
        <div className="content text-center" style={{ paddingTop: "120px" }}>
          <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
          <h4 className="mt-3 text-muted">Connecting to Blockchain Ledger...</h4>
        </div>
      );
    }

    return (
      <div className="content">
        {/* Verification Status Banner */}
        {/* Verification Status Banner */}
        <Row>
          <Col md="12">
            {!isRegistered ? (
              <div style={{
                background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "14px",
                padding: "20px 24px",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px"
              }}>
                <div>
                  <h4 style={{ color: "#991b1b", margin: "0 0 4px 0", fontWeight: 800, fontSize: "17px" }}>
                    ⚠️ Unregistered Wallet Address
                  </h4>
                  <span style={{ color: "#475569", fontSize: "13.5px" }}>
                    This wallet (<code>{account}</code>) is not yet registered as a User.
                  </span>
                </div>
                <Link to="/RegisterUser" className="btn btn-warning btn-sm" style={{ fontWeight: 800, padding: "8px 18px", borderRadius: "8px" }}>
                  Complete User Registration →
                </Link>
              </div>
            ) : isRejected ? (
              <div style={{
                background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "14px",
                padding: "20px 24px",
                marginBottom: "24px"
              }}>
                <h4 style={{ color: "#991b1b", margin: "0 0 4px 0", fontWeight: 800, fontSize: "17px" }}>
                  ✗ KYC Verification Rejected by Land Inspector
                </h4>
                <p style={{ margin: 0, color: "#475569", fontSize: "13.5px" }}>
                  Reason: <strong>{rejectionReason || "Identity document could not be validated."}</strong> Please contact Tehsil Revenue office.
                </p>
              </div>
            ) : isVerified ? (
              <div style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.02) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "14px",
                padding: "20px 24px",
                marginBottom: "24px",
                boxShadow: "0 4px 16px -2px rgba(16, 185, 129, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#dcfce7",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    ✓
                  </div>
                  <div>
                    <h4 style={{ color: "#065f46", margin: "0 0 4px 0", fontWeight: 800, fontSize: "17px" }}>
                      Verified User Profile
                    </h4>
                    <span style={{ color: "#334155", fontSize: "13.5px" }}>
                      Welcome back, <strong>{user.name || 'User'}</strong>! You have full permissions to register, sell, and purchase land parcels.
                    </span>
                  </div>
                </div>
                <Badge color="success" style={{ padding: "8px 16px", fontSize: "11.5px", borderRadius: "20px", fontWeight: 800, letterSpacing: "0.5px" }}>
                  ✓ KYC APPROVED
                </Badge>
              </div>
            ) : (
              <div style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.02) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: "14px",
                padding: "20px 24px",
                marginBottom: "24px",
                boxShadow: "0 4px 16px -2px rgba(245, 158, 11, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#fef3c7",
                    color: "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0
                  }}>
                    ⏳
                  </div>
                  <div>
                    <h4 style={{ color: "#92400e", margin: "0 0 4px 0", fontWeight: 800, fontSize: "17px" }}>
                      KYC Verification Pending
                    </h4>
                    <span style={{ color: "#475569", fontSize: "13.5px" }}>
                      Your account is registered and awaiting government Land Inspector verification. Once verified, you can list properties and make purchases.
                    </span>
                  </div>
                </div>
                <Badge color="warning" style={{ padding: "8px 16px", fontSize: "11.5px", borderRadius: "20px", fontWeight: 800 }}>
                  UNDER REVIEW
                </Badge>
              </div>
            )}
          </Col>
        </Row>

        {/* 4 Key Metrics Cards */}
        <Row>
          <Col lg="3" md="6">
            <Card className="card-stats" style={{ borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <CardBody style={{ padding: "20px" }}>
                <Row className="align-items-center">
                  <Col xs="4">
                    <div style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "12px",
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px"
                    }}>
                      <i className="tim-icons icon-bank" />
                    </div>
                  </Col>
                  <Col xs="8">
                    <div className="numbers text-right">
                      <p style={{ margin: "0 0 4px 0", fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>
                        My Owned Lands
                      </p>
                      <CardTitle tag="h3" style={{ margin: 0, fontWeight: 800, color: "#0f172a", fontSize: "28px" }}>
                        {myLandsCount}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>

          <Col lg="3" md="6">
            <Card className="card-stats" style={{ borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <CardBody style={{ padding: "20px" }}>
                <Row className="align-items-center">
                  <Col xs="4">
                    <div style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "12px",
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#059669",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px"
                    }}>
                      <i className="tim-icons icon-cart" />
                    </div>
                  </Col>
                  <Col xs="8">
                    <div className="numbers text-right">
                      <p style={{ margin: "0 0 4px 0", fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>
                        Available in Market
                      </p>
                      <CardTitle tag="h3" style={{ margin: 0, fontWeight: 800, color: "#0f172a", fontSize: "28px" }}>
                        {marketplaceCount}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>

          <Col lg="3" md="6">
            <Card className="card-stats" style={{ borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <CardBody style={{ padding: "20px" }}>
                <Row className="align-items-center">
                  <Col xs="4">
                    <div style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "12px",
                      background: "rgba(245, 158, 11, 0.12)",
                      color: "#d97706",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px"
                    }}>
                      <i className="tim-icons icon-bell-55" />
                    </div>
                  </Col>
                  <Col xs="8">
                    <div className="numbers text-right">
                      <p style={{ margin: "0 0 4px 0", fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>
                        Incoming Offers
                      </p>
                      <CardTitle tag="h3" style={{ margin: 0, fontWeight: 800, color: "#0f172a", fontSize: "28px" }}>
                        {incomingRequestsCount}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>

          <Col lg="3" md="6">
            <Card className="card-stats" style={{ borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <CardBody style={{ padding: "20px" }}>
                <Row className="align-items-center">
                  <Col xs="4">
                    <div style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "12px",
                      background: "rgba(239, 68, 68, 0.12)",
                      color: "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px"
                    }}>
                      <i className="tim-icons icon-money-coins" />
                    </div>
                  </Col>
                  <Col xs="8">
                    <div className="numbers text-right">
                      <p style={{ margin: "0 0 4px 0", fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>
                        Sent Offers & Pay
                      </p>
                      <CardTitle tag="h3" style={{ margin: 0, fontWeight: 800, color: "#0f172a", fontSize: "28px" }}>
                        {sentRequestsCount}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>


        {/* My Owned Lands Quick Table */}
        <Row>
          <Col md="12">
            <Card>
              <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <CardTitle tag="h4" style={{ margin: 0, fontWeight: "bold" }}>
                  🏡 My Registered Properties ({myLands.length})
                </CardTitle>
                <Link to="/User/MyLands" className="btn btn-outline-info btn-sm">
                  Manage All Properties →
                </Link>
              </CardHeader>
              <CardBody>
                {myLands.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <p style={{ fontSize: "16px" }}>You currently do not own any registered lands.</p>
                    <Link to="/User/AddLand" className="btn btn-info btn-sm">
                      + Register Your First Land
                    </Link>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Land #</th>
                        <th>Survey No.</th>
                        <th>Location</th>
                        <th>Area (Sq Ft)</th>
                        <th>Price</th>
                        <th>Govt Status</th>
                        <th>Sale Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myLands.slice(0, 5).map((l) => (
                        <tr key={l.id}>
                          <td><strong>#{l.id}</strong></td>
                          <td>{l.survey}</td>
                          <td>{l.city}, {l.state}</td>
                          <td>{l.area}</td>
                          <td>
                            <strong>₹ {l.price}</strong>
                            <small className="text-muted d-block">
                              ~{(parseFloat(l.price) * 0.0000057).toFixed(5)} ETH
                            </small>
                          </td>
                          <td>
                            {l.isLandVerif ? (
                              <Badge color="success">✓ Verified</Badge>
                            ) : (
                              <Badge color="warning">⏳ Pending</Badge>
                            )}
                          </td>
                          <td>
                            {l.isOnSale ? (
                              <Badge color="info">Listed for Sale</Badge>
                            ) : (
                              <Badge color="secondary">Not Listed</Badge>
                            )}
                          </td>
                          <td>
                            <Link to="/User/MyLands" className="btn btn-primary btn-sm">
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
}

export default UserDashboard;
