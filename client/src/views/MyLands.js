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
  InputGroup,
  InputGroupAddon,
} from "reactstrap";

class MyLands extends Component {
  constructor(props) {
    super(props);
    this.state = {
      LandInstance: null,
      account: null,
      web3: null,
      loading: true,
      myLands: [],
      priceInputs: {},
      txLoadingId: null,
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
      const totalLands = parseInt(await instance.methods.getLandsCount().call() || 0);
      let myLands = [];

      for (let i = 1; i <= totalLands; i++) {
        try {
          const owner = await instance.methods.getLandOwner(i).call();
          if (owner && currentAddress && owner.toLowerCase() === currentAddress.toLowerCase()) {
            const isLandVerif = await instance.methods.isLandVerified(i).call();
            const isLandRej = instance.methods.isLandRejected ? await instance.methods.isLandRejected(i).call() : false;
            let rejReason = '';
            if (isLandRej && instance.methods.getLandRejectionReason) {
              rejReason = await instance.methods.getLandRejectionReason(i).call();
            }
            const isOnSale = await instance.methods.isLandOnSale(i).call();
            const area = await instance.methods.getArea(i).call();
            const city = await instance.methods.getCity(i).call();
            const stateLoc = await instance.methods.getState(i).call();
            const price = await instance.methods.getPrice(i).call();
            const pid = await instance.methods.getPID(i).call();
            const survey = await instance.methods.getSurveyNumber(i).call();
            const doc = await instance.methods.getDocument(i).call();

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
              isLandRej,
              rejReason,
              isOnSale,
            });
          }
        } catch (e) {
          console.warn("Error fetching land:", i, e);
        }
      }

      this.setState({
        web3,
        account: currentAddress,
        LandInstance: instance,
        loading: false,
        myLands,
      });

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    } catch (err) {
      console.error("MyLands mount error:", err);
      this.setState({ loading: false });
    }
  };

  handlePriceChange = (id, val) => {
    this.setState(prevState => ({
      priceInputs: { ...prevState.priceInputs, [id]: val }
    }));
  };

  handleListForSale = async (id) => {
    const { LandInstance, account, priceInputs, myLands } = this.state;
    const current = myLands.find(l => l.id === id);
    const newPrice = priceInputs[id] ? parseInt(priceInputs[id]) : parseInt(current.price);

    this.setState({ txLoadingId: id });
    try {
      await LandInstance.methods.listLandForSale(id, newPrice).send({
        from: account,
        gas: 500000,
      });
      alert(`Property #${id} successfully listed for sale at ₹ ${newPrice}!`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error listing property: " + (err.message || err));
      this.setState({ txLoadingId: null });
    }
  };

  handleCancelSale = async (id) => {
    const { LandInstance, account } = this.state;
    this.setState({ txLoadingId: id });
    try {
      await LandInstance.methods.cancelLandSale(id).send({
        from: account,
        gas: 500000,
      });
      alert(`Listing for Property #${id} has been cancelled.`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error cancelling listing: " + (err.message || err));
      this.setState({ txLoadingId: null });
    }
  };

  render() {
    const { loading, myLands, txLoadingId, priceInputs } = this.state;

    if (loading) {
      return (
        <div className="content text-center" style={{ paddingTop: "120px" }}>
          <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
          <h4 className="mt-3 text-muted">Loading Your Property Registry...</h4>
        </div>
      );
    }

    return (
      <div className="content">
        <Row>
          <Col md="12">
            <Card>
              <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <CardTitle tag="h3" style={{ fontWeight: "bold", margin: 0 }}>
                    🏛️ My Owned Properties & Title Deeds ({myLands.length})
                  </CardTitle>
                  <p className="text-muted" style={{ margin: "4px 0 0 0", fontSize: "14px" }}>
                    Manage your verified real estate records, view 7/12 extracts, and list properties for sale.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <Link to="/User/AddLand" className="btn btn-primary" style={{ fontWeight: "bold" }}>
                    <i className="tim-icons icon-simple-add mr-1" /> + Register New Land
                  </Link>
                  <Link to="/User/IncomingRequests" className="btn btn-outline-success" style={{ fontWeight: "bold" }}>
                    📬 Incoming Purchase Offers →
                  </Link>
                </div>
              </CardHeader>

              <CardBody>
                {myLands.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="tim-icons icon-bank text-muted" style={{ fontSize: "3.5rem" }} />
                    <h4 className="mt-3 font-weight-bold">No Properties Registered Under Your Wallet</h4>
                    <p className="text-muted">
                      Register your existing land parcel with government survey proof or purchase verified properties from the marketplace.
                    </p>
                    <Link to="/User/AddLand" className="btn btn-info mt-2">
                      Register Land
                    </Link>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead className="text-primary">
                      <tr>
                        <th>Land ID</th>
                        <th>Survey Number</th>
                        <th>Property PID</th>
                        <th>Area (Sq Ft)</th>
                        <th>City / State</th>
                        <th>Asking Price</th>
                        <th>Govt Verification</th>
                        <th>Ownership Proof</th>
                        <th>Sale Status & Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myLands.map((land) => {
                        const isProcessing = txLoadingId === land.id;
                        return (
                          <tr key={land.id}>
                            <td><strong>#{land.id}</strong></td>
                            <td><span className="badge badge-secondary">{land.survey}</span></td>
                            <td><code>{land.pid}</code></td>
                            <td>{land.area} sq ft</td>
                            <td>{land.city}, {land.state}</td>
                            <td>
                              <strong>₹ {land.price}</strong>
                              <small className="text-muted d-block">
                                ~{(parseFloat(land.price) * 0.0000057).toFixed(5)} ETH
                              </small>
                            </td>
                            <td>
                              {land.isLandVerif ? (
                                <Badge color="success" style={{ padding: "6px 10px" }}>
                                  ✓ Verified by Govt
                                </Badge>
                              ) : land.isLandRej ? (
                                <div>
                                  <Badge color="danger" style={{ padding: "6px 10px" }}>
                                    ✗ Rejected
                                  </Badge>
                                  {land.rejReason && (
                                    <small className="text-danger d-block mt-1">
                                      {land.rejReason}
                                    </small>
                                  )}
                                </div>
                              ) : (
                                <Badge color="warning" style={{ padding: "6px 10px" }}>
                                  ⏳ Pending Inspection
                                </Badge>
                              )}
                            </td>
                            <td>
                              <a
                                href={`/view-document?cid=${land.doc || 'QmSample712Extract'}&type=7/12 Land Extract&landId=${land.id}&area=${land.area}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-info btn-sm"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                              >
                                📄 View 7/12 Extract
                              </a>
                            </td>
                            <td style={{ minWidth: "220px" }}>
                              {!land.isLandVerif ? (
                                <span className="text-muted" style={{ fontSize: "12px" }}>
                                  Cannot list until verified by Land Inspector
                                </span>
                              ) : land.isOnSale ? (
                                <div>
                                  <Badge color="info" className="mb-2 d-inline-block">
                                    ✓ Active on Marketplace
                                  </Badge>
                                  <Button
                                    color="danger"
                                    size="sm"
                                    className="d-block"
                                    disabled={isProcessing}
                                    onClick={() => this.handleCancelSale(land.id)}
                                    style={{ fontSize: "11px", padding: "5px 10px" }}
                                  >
                                    {isProcessing ? "Processing..." : "Cancel Sale Listing"}
                                  </Button>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                                    <Input
                                      type="number"
                                      placeholder="Price in ₹"
                                      defaultValue={land.price}
                                      onChange={(e) => this.handlePriceChange(land.id, e.target.value)}
                                      style={{ height: "30px", fontSize: "12px", width: "110px" }}
                                    />
                                    <Button
                                      color="success"
                                      size="sm"
                                      disabled={isProcessing}
                                      onClick={() => this.handleListForSale(land.id)}
                                      style={{ fontSize: "11px", padding: "5px 10px", margin: 0 }}
                                    >
                                      {isProcessing ? "..." : "List for Sale"}
                                    </Button>
                                  </div>
                                </div>
                              )}
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
      </div>
    );
  }
}

export default MyLands;
