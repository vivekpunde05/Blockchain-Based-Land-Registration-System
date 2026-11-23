import React, { Component } from 'react';
import Land from "../artifacts/Land.json";
import getWeb3 from "../getWeb3";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table,
  Row,
  Col,
  Badge,
  Spinner,
  Input,
  Button,
  FormGroup,
  Alert,
} from "reactstrap";

class TransactionHistory extends Component {
  constructor(props) {
    super(props);
    this.state = {
      LandInstance: null,
      account: null,
      web3: null,
      loading: true,
      transactions: [],
      totalLandsCount: 0,
      searchLandId: '',
      inspectedLand: null,
      inspecting: false,
      inspectError: '',
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
      const totalTxs = parseInt(await instance.methods.getTransactionsCount().call() || 0);
      const totalLandsCount = parseInt(await instance.methods.getLandsCount().call() || 0);
      let transactions = [];

      for (let i = 1; i <= totalTxs; i++) {
        try {
          const record = await instance.methods.getTransactionRecord(i).call();
          const txId = record[0];
          const landId = record[1];
          const seller = record[2];
          const buyer = record[3];
          const amountWei = record[4];
          const timestamp = record[5];

          const ethAmount = web3.utils.fromWei(amountWei.toString(), 'ether');
          const dateObj = new Date(parseInt(timestamp) * 1000);
          const formattedDate = isNaN(dateObj.getTime()) ? 'N/A' : dateObj.toLocaleString();

          transactions.push({
            txId: parseInt(txId),
            landId: parseInt(landId),
            seller,
            buyer,
            amountEth: ethAmount,
            timestamp: formattedDate,
          });
        } catch (e) {
          console.warn("Tx fetch error at:", i, e);
        }
      }

      this.setState({
        web3,
        account: currentAddress,
        LandInstance: instance,
        loading: false,
        transactions,
        totalLandsCount,
      });

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    } catch (err) {
      console.error("Tx History mount error:", err);
      this.setState({ loading: false });
    }
  };

  handleInspectProperty = async (e) => {
    e && e.preventDefault();
    const { searchLandId, LandInstance, totalLandsCount, transactions } = this.state;
    const landId = parseInt(searchLandId);

    if (isNaN(landId) || landId <= 0 || landId > totalLandsCount) {
      this.setState({ 
        inspectError: `Please enter a valid Property ID between 1 and ${totalLandsCount}.`, 
        inspectedLand: null 
      });
      return;
    }

    this.setState({ inspecting: true, inspectError: '' });

    try {
      const owner = await LandInstance.methods.getLandOwner(landId).call();
      let ownerName = 'Registered Citizen';
      let ownerEmail = '';
      try {
        const profile = await LandInstance.methods.UserMapping(owner).call();
        if (profile && profile.name) {
          ownerName = profile.name;
          ownerEmail = profile.email;
        }
      } catch (err) {
        // Ignore
      }

      const area = await LandInstance.methods.getArea(landId).call();
      const city = await LandInstance.methods.getCity(landId).call();
      const stateLoc = await LandInstance.methods.getState(landId).call();
      const price = await LandInstance.methods.getPrice(landId).call();
      const pid = await LandInstance.methods.getPID(landId).call();
      const survey = await LandInstance.methods.getSurveyNumber(landId).call();
      const isLandVerif = await LandInstance.methods.isLandVerified(landId).call();
      const isOnSale = await LandInstance.methods.isLandOnSale(landId).call();
      const isPaid = LandInstance.methods.isPaid ? await LandInstance.methods.isPaid(landId).call() : false;
      const doc = await LandInstance.methods.getDocument(landId).call();

      // Find all transaction records associated with this land parcel
      const landTransfers = transactions.filter(t => t.landId === landId);

      this.setState({
        inspecting: false,
        inspectedLand: {
          id: landId,
          owner,
          ownerName,
          ownerEmail,
          area: parseInt(area) || 0,
          city,
          state: stateLoc,
          price: parseInt(price) || 0,
          pid,
          survey,
          isLandVerif,
          isOnSale,
          isPaid,
          doc,
          transfers: landTransfers,
        },
      });
    } catch (err) {
      console.error("Inspect error:", err);
      this.setState({ inspecting: false, inspectError: `Failed to inspect property #${landId}: ${err.message || err}` });
    }
  };

  render() {
    const { 
      loading, 
      transactions, 
      account, 
      totalLandsCount, 
      searchLandId, 
      inspectedLand, 
      inspecting, 
      inspectError 
    } = this.state;

    if (loading) {
      return (
        <div className="content text-center" style={{ paddingTop: "120px" }}>
          <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
          <h4 className="mt-3 text-muted">Loading Blockchain Ledger Records...</h4>
        </div>
      );
    }

    return (
      <div className="content">
        {/* Module 1: Property Ownership & Provenance Verification Lookup */}
        <Row>
          <Col md="12">
            <Card style={{ marginBottom: "24px" }}>
              <CardHeader>
                <CardTitle tag="h3" style={{ fontWeight: 800, margin: 0 }}>
                  🔍 Verify Property Ownership & Provenance
                </CardTitle>
              </CardHeader>
              <CardBody>
                <form onSubmit={this.handleInspectProperty}>
                  <Row className="align-items-center">
                    <Col md="6">
                      <FormGroup style={{ margin: 0 }}>
                        <Input
                          type="number"
                          placeholder={`Enter Property ID (1 to ${totalLandsCount || 1})...`}
                          value={searchLandId}
                          onChange={(e) => this.setState({ searchLandId: e.target.value, inspectError: '' })}
                          style={{ height: "44px", borderRadius: "8px", fontSize: "14px" }}
                          required
                        />
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <Button
                        color="primary"
                        type="submit"
                        disabled={inspecting}
                        style={{ height: "44px", fontWeight: "bold", width: "100%", borderRadius: "8px" }}
                      >
                        {inspecting ? "Verifying On-Chain..." : "🔎 Verify Ownership"}
                      </Button>
                    </Col>
                  </Row>
                </form>

                {inspectError && (
                  <Alert color="danger" style={{ marginTop: "16px", borderRadius: "8px" }}>
                    {inspectError}
                  </Alert>
                )}

                {inspectedLand && (
                  <div style={{ marginTop: "20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <h4 style={{ fontWeight: 800, color: "#0f172a", margin: 0 }}>
                          Property #{inspectedLand.id} — Title Verification Record
                        </h4>
                        <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                          Physical Survey No: <strong>{inspectedLand.survey}</strong> | PID: <strong>{inspectedLand.pid}</strong>
                        </span>
                      </div>
                      <div>
                        {inspectedLand.isPaid ? (
                          <Badge color="info" style={{ fontSize: "12px", padding: "6px 12px" }}>📜 Sold & Transferred</Badge>
                        ) : inspectedLand.isOnSale ? (
                          <Badge color="success" style={{ fontSize: "12px", padding: "6px 12px" }}>🛒 Available for Sale</Badge>
                        ) : (
                          <Badge color="secondary" style={{ fontSize: "12px", padding: "6px 12px" }}>🔒 Private / Not on Sale</Badge>
                        )}
                        {inspectedLand.isLandVerif && (
                          <Badge color="success" style={{ fontSize: "12px", padding: "6px 12px", marginLeft: "6px" }}>✓ Verified by Govt</Badge>
                        )}
                      </div>
                    </div>

                    <Row>
                      <Col md="6">
                        <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #f1f5f9", marginBottom: "12px" }}>
                          <h6 style={{ fontWeight: 700, color: "#2563eb", marginBottom: "8px" }}>👑 Current Recorded Owner</h6>
                          <p style={{ margin: "3px 0", fontSize: "13px" }}>
                            <strong>Owner Name:</strong> {inspectedLand.ownerName}
                          </p>
                          <p style={{ margin: "3px 0", fontSize: "13px" }}>
                            <strong>Contact Email:</strong> {inspectedLand.ownerEmail || 'Registered Citizen'}
                          </p>
                          <p style={{ margin: "3px 0", fontSize: "13px" }}>
                            <strong>Ethereum Wallet Address:</strong>
                            <code className="d-block text-break" style={{ fontSize: "12px", background: "#f8fafc", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}>
                              {inspectedLand.owner}
                            </code>
                          </p>
                        </div>
                      </Col>

                      <Col md="6">
                        <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #f1f5f9", marginBottom: "12px" }}>
                          <h6 style={{ fontWeight: 700, color: "#2563eb", marginBottom: "8px" }}>📐 Location & Valuation</h6>
                          <p style={{ margin: "3px 0", fontSize: "13px" }}>
                            <strong>Location:</strong> {inspectedLand.city}, {inspectedLand.state}
                          </p>
                          <p style={{ margin: "3px 0", fontSize: "13px" }}>
                            <strong>Land Area:</strong> {inspectedLand.area.toLocaleString()} Sq Ft
                          </p>
                          <p style={{ margin: "3px 0", fontSize: "13px" }}>
                            <strong>Recorded Price:</strong> ₹ {inspectedLand.price.toLocaleString()} (~{(parseFloat(inspectedLand.price) * 0.0000057).toFixed(5)} ETH)
                          </p>
                          <div style={{ marginTop: "6px" }}>
                            <a
                              href={`/view-document?cid=${inspectedLand.doc || 'QmSample712Extract'}&type=7/12 Land Extract&landId=${inspectedLand.id}&area=${inspectedLand.area}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-info btn-sm"
                              style={{ padding: "4px 10px", fontSize: "11.5px" }}
                            >
                              📄 Open 7/12 Extract Document ↗
                            </a>
                          </div>
                        </div>
                      </Col>
                    </Row>

                    {/* Historical Ownership Transfers Provenance */}
                    <div style={{ marginTop: "12px" }}>
                      <h5 style={{ fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
                        📜 Ownership Transfer Provenance Chain ({inspectedLand.transfers.length})
                      </h5>
                      {inspectedLand.transfers.length === 0 ? (
                        <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #f1f5f9", color: "#64748b", fontSize: "13px" }}>
                          ℹ️ No secondary sales yet. Property remains with the original registering owner.
                        </div>
                      ) : (
                        <Table responsive size="sm" style={{ background: "#ffffff", borderRadius: "8px" }}>
                          <thead className="text-primary">
                            <tr>
                              <th>Tx #</th>
                              <th>Previous Owner (Seller)</th>
                              <th>New Owner (Buyer)</th>
                              <th>Transfer Value</th>
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inspectedLand.transfers.map(t => (
                              <tr key={t.txId}>
                                <td><strong>#{t.txId}</strong></td>
                                <td><code>{t.seller.substring(0, 8)}...{t.seller.substring(t.seller.length - 4)}</code></td>
                                <td><code>{t.buyer.substring(0, 8)}...{t.buyer.substring(t.buyer.length - 4)}</code></td>
                                <td><strong style={{ color: "#27ae60" }}>{parseFloat(t.amountEth).toFixed(5)} ETH</strong></td>
                                <td>{t.timestamp}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Module 2: Global Ledger of All Recorded Transactions */}
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h3" style={{ fontWeight: 800, margin: 0 }}>
                  📜 Global Immutable Blockchain Ledger ({transactions.length})
                </CardTitle>
              </CardHeader>

              <CardBody>
                {transactions.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="tim-icons icon-bullet-list-67 text-muted" style={{ fontSize: "3.5rem" }} />
                    <h4 className="mt-3 font-weight-bold">No Completed Transactions on Ledger Yet</h4>
                    <p>Once a buyer completes payment for an accepted land request, the record appears here immutably.</p>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead className="text-primary">
                      <tr>
                        <th>Tx #</th>
                        <th>Land ID</th>
                        <th>Previous Owner (Seller)</th>
                        <th>New Owner (Buyer)</th>
                        <th>Settlement Amount</th>
                        <th>Block Timestamp</th>
                        <th>Your Participation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => {
                        const isBuyer = account && tx.buyer && tx.buyer.toLowerCase() === account.toLowerCase();
                        const isSeller = account && tx.seller && tx.seller.toLowerCase() === account.toLowerCase();

                        return (
                          <tr key={tx.txId} style={isBuyer || isSeller ? { backgroundColor: "rgba(39, 174, 96, 0.05)" } : {}}>
                            <td><strong>#{tx.txId}</strong></td>
                            <td><strong>Property #{tx.landId}</strong></td>
                            <td>
                              <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
                                {tx.seller.substring(0, 8)}...{tx.seller.substring(tx.seller.length - 4)}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
                                {tx.buyer.substring(0, 8)}...{tx.buyer.substring(tx.buyer.length - 4)}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: "#27ae60" }}>{parseFloat(tx.amountEth).toFixed(5)} ETH</strong>
                            </td>
                            <td>{tx.timestamp}</td>
                            <td>
                              {isBuyer ? (
                                <Badge color="success">You Purchased (New Owner)</Badge>
                              ) : isSeller ? (
                                <Badge color="info">You Sold (Transferred)</Badge>
                              ) : (
                                <Badge color="secondary">Public Ledger</Badge>
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

export default TransactionHistory;
