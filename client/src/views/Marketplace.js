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
  Input,
  FormGroup,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ButtonGroup,
} from "reactstrap";

class Marketplace extends Component {
  constructor(props) {
    super(props);
    this.state = {
      LandInstance: null,
      account: null,
      web3: null,
      loading: true,
      allLands: [],
      activeFilter: 'all', // 'all', 'onSale', 'sold'
      searchTerm: '',
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
      selectedProperty: null,
      modalOpen: false,
      isVerifiedUser: false,
      txProcessingId: null,
      feedbackMessage: '',
      feedbackType: 'info',
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

      let isVerifiedUser = false;
      if (currentAddress) {
        isVerifiedUser = await instance.methods.isVerified(currentAddress).call();
      }

      const totalLands = parseInt(await instance.methods.getLandsCount().call() || 0);
      let allLands = [];

      for (let i = 1; i <= totalLands; i++) {
        try {
          const isLandVerif = await instance.methods.isLandVerified(i).call();
          const isOnSale = await instance.methods.isLandOnSale(i).call();
          const owner = await instance.methods.getLandOwner(i).call();
          const area = await instance.methods.getArea(i).call();
          const city = await instance.methods.getCity(i).call();
          const stateLoc = await instance.methods.getState(i).call();
          const price = await instance.methods.getPrice(i).call();
          const pid = await instance.methods.getPID(i).call();
          const survey = await instance.methods.getSurveyNumber(i).call();
          const doc = await instance.methods.getDocument(i).call();
          const isPaid = instance.methods.isPaid ? await instance.methods.isPaid(i).call() : false;

          let ownerName = 'Registered Citizen';
          let ownerEmail = '';
          try {
            const ownerProfile = await instance.methods.UserMapping(owner).call();
            if (ownerProfile && ownerProfile.name) {
              ownerName = ownerProfile.name;
              ownerEmail = ownerProfile.email;
            }
          } catch (profileErr) {
            // Ignore
          }

          allLands.push({
            id: i,
            owner,
            ownerName,
            ownerEmail,
            area: parseInt(area) || 0,
            city: city || 'N/A',
            state: stateLoc || 'N/A',
            price: parseInt(price) || 0,
            pid: pid || 'N/A',
            survey: survey || 'N/A',
            doc,
            isLandVerif,
            isOnSale,
            isPaid,
          });
        } catch (e) {
          console.warn("Marketplace fetch error at id:", i, e);
        }
      }

      this.setState({
        web3,
        account: currentAddress,
        LandInstance: instance,
        loading: false,
        allLands,
        isVerifiedUser,
      });

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    } catch (err) {
      console.error("Marketplace mount error:", err);
      this.setState({ loading: false });
    }
  };

  handleRequestLand = async (sellerAddress, landId) => {
    const { LandInstance, account, isVerifiedUser } = this.state;

    if (!isVerifiedUser) {
      alert("You must be a KYC-verified User to submit purchase requests. Please await Land Inspector verification.");
      return;
    }

    if (sellerAddress.toLowerCase() === account.toLowerCase()) {
      alert("Action prohibited: You cannot purchase your own property!");
      return;
    }

    this.setState({ txProcessingId: landId, feedbackMessage: '' });

    try {
      await LandInstance.methods.requestLand(sellerAddress, landId).send({
        from: account,
        gas: 2100000,
      });

      this.setState({
        txProcessingId: null,
        modalOpen: false,
        feedbackMessage: `✓ Purchase request for Property #${landId} submitted successfully on blockchain! You can track this under "My Offers & Buy".`,
        feedbackType: 'success',
      });
    } catch (err) {
      console.error("Request land error:", err);
      this.setState({
        txProcessingId: null,
        feedbackMessage: `Failed to submit request: ${err.message || err}`,
        feedbackType: 'danger',
      });
    }
  };

  openPropertyDetails = (property) => {
    this.setState({ selectedProperty: property, modalOpen: true });
  };

  toggleModal = () => {
    this.setState(prevState => ({ modalOpen: !prevState.modalOpen }));
  };

  render() {
    const { 
      loading, 
      allLands, 
      account, 
      activeFilter, 
      searchTerm, 
      minPrice, 
      maxPrice, 
      minArea, 
      maxArea, 
      selectedProperty, 
      modalOpen, 
      isVerifiedUser, 
      txProcessingId, 
      feedbackMessage, 
      feedbackType 
    } = this.state;

    if (loading) {
      return (
        <div className="content text-center" style={{ paddingTop: "120px" }}>
          <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
          <h4 className="mt-3 text-muted">Loading Properties from Ethereum Blockchain...</h4>
        </div>
      );
    }

    // Apply Filters & Search
    const filteredLands = allLands.filter(land => {
      // Tab Filter
      if (activeFilter === 'onSale' && !land.isOnSale) return false;
      if (activeFilter === 'sold' && (!land.isPaid && land.isOnSale)) return false;

      // Search Filter: location, survey, PID, or owner
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesLocation = (land.city && land.city.toLowerCase().includes(term)) || (land.state && land.state.toLowerCase().includes(term));
        const matchesPID = land.pid && land.pid.toString().toLowerCase().includes(term);
        const matchesSurvey = land.survey && land.survey.toString().toLowerCase().includes(term);
        const matchesOwner = (land.owner && land.owner.toLowerCase().includes(term)) || (land.ownerName && land.ownerName.toLowerCase().includes(term));
        if (!matchesLocation && !matchesPID && !matchesSurvey && !matchesOwner) {
          return false;
        }
      }

      // Price Filter
      if (minPrice && land.price < parseInt(minPrice)) return false;
      if (maxPrice && land.price > parseInt(maxPrice)) return false;

      // Area Filter
      if (minArea && land.area < parseInt(minArea)) return false;
      if (maxArea && land.area > parseInt(maxArea)) return false;

      return true;
    });

    const totalCount = allLands.length;
    const onSaleCount = allLands.filter(l => l.isOnSale).length;
    const soldCount = allLands.filter(l => l.isPaid).length;

    return (
      <div className="content">
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <CardTitle tag="h3" style={{ fontWeight: 800, margin: 0 }}>
                      🏛️ View All Registered Properties
                    </CardTitle>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <Link to="/User/AddLand" className="btn btn-primary btn-sm" style={{ fontWeight: "bold" }}>
                      ➕ Register New Property
                    </Link>
                    <Link to="/User/SentRequests" className="btn btn-outline-info btn-sm">
                      My Offers & Buy →
                    </Link>
                  </div>
                </div>

                {/* Status Filter Tabs */}
                <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <ButtonGroup size="sm">
                    <Button
                      color={activeFilter === 'all' ? 'primary' : 'secondary'}
                      onClick={() => this.setState({ activeFilter: 'all' })}
                      style={{ fontWeight: "700" }}
                    >
                      All Properties ({totalCount})
                    </Button>
                    <Button
                      color={activeFilter === 'onSale' ? 'success' : 'secondary'}
                      onClick={() => this.setState({ activeFilter: 'onSale' })}
                      style={{ fontWeight: "700" }}
                    >
                      🛒 Available for Sale ({onSaleCount})
                    </Button>
                    <Button
                      color={activeFilter === 'sold' ? 'info' : 'secondary'}
                      onClick={() => this.setState({ activeFilter: 'sold' })}
                      style={{ fontWeight: "700" }}
                    >
                      📜 Sold / Transferred ({soldCount})
                    </Button>
                  </ButtonGroup>
                </div>

                {/* Search & Numeric Filters */}
                <Row className="mt-3">
                  <Col md="4">
                    <FormGroup>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Search Properties</label>
                      <Input
                        type="text"
                        placeholder="🔍 Location, Survey #, PID, or Owner..."
                        value={searchTerm}
                        onChange={(e) => this.setState({ searchTerm: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", fontSize: "13.5px" }}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="2">
                    <FormGroup>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Min Price (₹)</label>
                      <Input
                        type="number"
                        placeholder="Min ₹"
                        value={minPrice}
                        onChange={(e) => this.setState({ minPrice: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", fontSize: "13.5px" }}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="2">
                    <FormGroup>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Max Price (₹)</label>
                      <Input
                        type="number"
                        placeholder="Max ₹"
                        value={maxPrice}
                        onChange={(e) => this.setState({ maxPrice: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", fontSize: "13.5px" }}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="2">
                    <FormGroup>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Min Area (Sq Ft)</label>
                      <Input
                        type="number"
                        placeholder="Min Sq Ft"
                        value={minArea}
                        onChange={(e) => this.setState({ minArea: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", fontSize: "13.5px" }}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="2">
                    <FormGroup>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Max Area (Sq Ft)</label>
                      <Input
                        type="number"
                        placeholder="Max Sq Ft"
                        value={maxArea}
                        onChange={(e) => this.setState({ maxArea: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", fontSize: "13.5px" }}
                      />
                    </FormGroup>
                  </Col>
                </Row>
              </CardHeader>

              <CardBody>
                {feedbackMessage && (
                  <Alert color={feedbackType} style={{ borderRadius: "8px" }}>
                    {feedbackMessage}
                  </Alert>
                )}

                {!isVerifiedUser && (
                  <Alert color="warning" style={{ borderRadius: "8px" }}>
                    <strong>Note:</strong> Your wallet account is awaiting government KYC verification. You can view all registered properties, but submitting purchase offers requires verified status.
                  </Alert>
                )}

                {filteredLands.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="tim-icons icon-zoom-split text-muted" style={{ fontSize: "3.5rem" }} />
                    <h4 className="mt-3 font-weight-bold">No Properties Found</h4>
                    <p>No registered land parcels matched your active filters or search criteria.</p>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead className="text-primary">
                      <tr>
                        <th>Property ID</th>
                        <th>Location</th>
                        <th>Survey #</th>
                        <th>PID</th>
                        <th>Area (Sq Ft)</th>
                        <th>Price (₹ / ETH)</th>
                        <th>Status</th>
                        <th>Current Owner</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLands.map((land) => {
                        const isMyLand = account && land.owner && land.owner.toLowerCase() === account.toLowerCase();
                        const isProcessing = txProcessingId === land.id;

                        let statusBadge = null;
                        if (!land.isLandVerif) {
                          statusBadge = <Badge color="warning">⏳ Govt Verification Pending</Badge>;
                        } else if (land.isPaid) {
                          statusBadge = <Badge color="info">📜 Sold & Transferred</Badge>;
                        } else if (land.isOnSale) {
                          statusBadge = <Badge color="success">🛒 Available for Sale</Badge>;
                        } else {
                          statusBadge = <Badge color="secondary">🔒 Not for Sale</Badge>;
                        }

                        return (
                          <tr key={land.id}>
                            <td><strong>#{land.id}</strong></td>
                            <td>
                              <strong>{land.city}</strong>, {land.state}
                            </td>
                            <td><span className="badge badge-dark">{land.survey}</span></td>
                            <td><code>{land.pid}</code></td>
                            <td>{land.area.toLocaleString()} sq ft</td>
                            <td>
                              <strong style={{ color: "#27ae60", fontSize: "14.5px" }}>₹ {land.price.toLocaleString()}</strong>
                              <small className="text-muted d-block">
                                ~{(parseFloat(land.price) * 0.0000057).toFixed(5)} ETH
                              </small>
                            </td>
                            <td>{statusBadge}</td>
                            <td>
                              <div>
                                <span style={{ fontWeight: "600", fontSize: "12.5px" }}>{land.ownerName}</span>
                                <code className="d-block" style={{ fontSize: "11px" }}>
                                  {land.owner.substring(0, 6)}...{land.owner.substring(land.owner.length - 4)}
                                </code>
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "6px" }}>
                                <Button
                                  color="info"
                                  size="sm"
                                  outline
                                  onClick={() => this.openPropertyDetails(land)}
                                  style={{ padding: "5px 10px", fontSize: "12px", fontWeight: "600" }}
                                >
                                  🔍 Details
                                </Button>

                                {land.isOnSale && land.isLandVerif && (
                                  isMyLand ? (
                                    <Badge color="light" style={{ color: "#64748b", padding: "6px 8px", fontSize: "11px" }}>
                                      Your Property
                                    </Badge>
                                  ) : (
                                    <Button
                                      color="success"
                                      size="sm"
                                      disabled={isProcessing || !isVerifiedUser}
                                      onClick={() => this.handleRequestLand(land.owner, land.id)}
                                      style={{ fontWeight: "bold", padding: "5px 12px", fontSize: "12px" }}
                                    >
                                      {isProcessing ? (
                                        <>
                                          <Spinner size="sm" /> Sending...
                                        </>
                                      ) : (
                                        "📩 Buy"
                                      )}
                                    </Button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Complete Property Details Modal */}
        {selectedProperty && (
          <Modal isOpen={modalOpen} toggle={this.toggleModal} size="lg">
            <ModalHeader toggle={this.toggleModal}>
              🏛️ Property Complete Details — #{selectedProperty.id} (PID: {selectedProperty.pid})
            </ModalHeader>
            <ModalBody>
              <Row>
                <Col md="6">
                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h5 style={{ fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>📍 Land Specifications</h5>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Location:</strong> {selectedProperty.city}, {selectedProperty.state}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Physical Survey No:</strong> {selectedProperty.survey}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Property ID (PID):</strong> {selectedProperty.pid}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Total Land Area:</strong> {selectedProperty.area.toLocaleString()} Sq Ft
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Current Valuation / Price:</strong> ₹ {selectedProperty.price.toLocaleString()} (~{(parseFloat(selectedProperty.price) * 0.0000057).toFixed(5)} ETH)
                    </p>
                  </div>
                </Col>

                <Col md="6">
                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h5 style={{ fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>👤 Current Owner & Title</h5>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Owner Name:</strong> {selectedProperty.ownerName}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Contact Email:</strong> {selectedProperty.ownerEmail || 'Registered Citizen'}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Ethereum Wallet:</strong>
                      <code className="d-block text-break" style={{ fontSize: "11.5px", marginTop: "2px" }}>
                        {selectedProperty.owner}
                      </code>
                    </p>
                    <p style={{ margin: "6px 0 0 0", fontSize: "13px" }}>
                      <strong>Verification Status:</strong>{" "}
                      {selectedProperty.isLandVerif ? (
                        <Badge color="success">✓ Verified by Govt Land Inspector</Badge>
                      ) : (
                        <Badge color="warning">⏳ Pending Verification</Badge>
                      )}
                    </p>
                  </div>
                </Col>
              </Row>

              <div style={{ background: "#eff6ff", border: "1px dashed #3b82f6", borderRadius: "10px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h6 style={{ fontWeight: "bold", margin: 0, color: "#1e40af" }}>📄 Official 7/12 Title Extract & Deed</h6>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#3b82f6" }}>
                    Verified cryptographic document proof stored on IPFS.
                  </p>
                </div>
                <a
                  href={`/view-document?cid=${selectedProperty.doc || 'QmSample712Extract'}&type=7/12 Land Extract&landId=${selectedProperty.id}&area=${selectedProperty.area}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: "bold" }}
                >
                  Open Document Viewer ↗
                </a>
              </div>
            </ModalBody>
            <ModalFooter>
              {selectedProperty.isOnSale && selectedProperty.isLandVerif && account && selectedProperty.owner.toLowerCase() !== account.toLowerCase() && (
                <Button
                  color="success"
                  disabled={txProcessingId === selectedProperty.id || !isVerifiedUser}
                  onClick={() => this.handleRequestLand(selectedProperty.owner, selectedProperty.id)}
                  style={{ fontWeight: "bold" }}
                >
                  {txProcessingId === selectedProperty.id ? "Submitting..." : "📩 Send Purchase Offer Now"}
                </Button>
              )}
              <Button color="secondary" onClick={this.toggleModal}>
                Close
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </div>
    );
  }
}

export default Marketplace;
