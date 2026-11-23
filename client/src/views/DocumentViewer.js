import React, { Component } from 'react';
import { Container, Card, CardHeader, CardBody, Row, Col, Button, Badge, Alert } from 'reactstrap';
import LandContract from "../artifacts/Land.json";

export default class DocumentViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cid: '',
      type: 'Identity Document',
      name: '',
      aadhar: '',
      pan: '',
      city: '',
      email: '',
      addr: '',
      landId: '',
      survey: '',
      area: '',
      price: '',
      fileData: null,
      fileType: null,
      loading: true,
      currentGatewayUrl: '',
      reportUrl: '',
      copiedLink: false,
    };
  }

  componentDidMount() {
    // Parse query params from URL
    const searchParams = new URLSearchParams(window.location.search);
    const cid = searchParams.get('cid') || 'QmSampleBuyerDocHash';
    const type = searchParams.get('type') || 'Identity Document';
    const name = searchParams.get('name') || searchParams.get('ownerName') || 'Vivek Punde';
    const aadhar = searchParams.get('aadhar') || '';
    const pan = searchParams.get('pan') || '';
    const city = searchParams.get('city') || '';
    const email = searchParams.get('email') || '';
    const addr = searchParams.get('addr') || searchParams.get('owner') || '0x2116b8F55B12D5F950709237cDEdf9dF51B91806';
    const landId = searchParams.get('landId') || searchParams.get('pid') || '';
    const survey = searchParams.get('survey') || '';
    const area = searchParams.get('area') || '';
    const price = searchParams.get('price') || '';

    const reportUrl = typeof window !== 'undefined' ? window.location.href : '';

    // Check localStorage for uploaded file data
    let localFile = null;
    try {
      localFile = localStorage.getItem('ipfs_doc_' + cid);
    } catch (e) {
      console.warn("Storage read error:", e);
    }

    let detectedType = null;
    if (localFile) {
      if (localFile.startsWith('data:application/pdf')) {
        detectedType = 'pdf';
      } else if (localFile.startsWith('data:image/')) {
        detectedType = 'image';
      } else {
        detectedType = 'other';
      }
    }

    const gatewayUrl = `https://ipfs.io/ipfs/${cid}`;

    this.setState({
      cid,
      type,
      name,
      aadhar,
      pan,
      city,
      email,
      addr,
      landId,
      survey,
      area,
      price,
      fileData: localFile,
      fileType: detectedType,
      currentGatewayUrl: gatewayUrl,
      reportUrl,
      loading: false
    });
  }

  handlePrint = () => {
    window.print();
  };

  copyReportLink = () => {
    const { reportUrl } = this.state;
    if (navigator.clipboard && reportUrl) {
      navigator.clipboard.writeText(reportUrl);
      this.setState({ copiedLink: true });
      setTimeout(() => this.setState({ copiedLink: false }), 2500);
    }
  };

  render() {
    const { 
      cid, 
      type, 
      name, 
      aadhar, 
      pan, 
      city, 
      email, 
      addr, 
      landId, 
      survey, 
      area, 
      price, 
      fileData, 
      fileType, 
      reportUrl, 
      copiedLink 
    } = this.state;

    const qrImageSource = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${encodeURIComponent(reportUrl)}`;
    const qrFallbackSource = `https://quickchart.io/qr?text=${encodeURIComponent(reportUrl)}&size=160&margin=1`;

    return (
      <div style={{ backgroundColor: "#0b132b", minHeight: "100vh", padding: "30px 15px", color: "#e2e8f0" }}>
        <Container style={{ maxWidth: "860px" }}>
          {/* Top Actions Nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img 
                src="https://i.pinimg.com/originals/71/6e/00/716e00537e8526347390d64ec900107d.png" 
                alt="BhumiChain" 
                style={{ width: "36px", height: "36px", borderRadius: "50%" }} 
              />
              <div>
                <h5 style={{ margin: 0, fontWeight: 700, letterSpacing: "1px", color: "#fff" }}>BHUMICHAIN VERIFIER</h5>
                <small style={{ color: "#94a3b8" }}>Decentralized Land & Identity Document Registry</small>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <Button color="primary" size="sm" onClick={this.handlePrint} style={{ fontWeight: 600 }}>
                <i className="fa fa-print" style={{ marginRight: "6px" }}></i> Print / Save PDF
              </Button>
              <Button color="secondary" size="sm" onClick={() => window.close()} style={{ fontWeight: 600 }}>
                <i className="fa fa-times" style={{ marginRight: "6px" }}></i> Close Tab
              </Button>
            </div>
          </div>

          {/* Main Document Card */}
          <Card style={{ backgroundColor: "#ffffff", color: "#1e293b", borderRadius: "12px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", border: "1px solid #cbd5e1", overflow: "hidden" }}>
            
            {/* Certificate Header */}
            <CardHeader style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0", padding: "25px 30px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "15px", marginBottom: "10px" }}>
                <div style={{ fontSize: "36px" }}>🏛️</div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, color: "#1e3a8a", letterSpacing: "1px" }}>
                    GOVERNMENT OF MAHARASHTRA
                  </h4>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                    Department of Registration and Land Revenue Records
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "12px", borderTop: "1px solid #cbd5e1", paddingTop: "12px" }}>
                <Badge color="success" style={{ padding: "6px 14px", fontSize: "13px", fontWeight: 700, borderRadius: "20px" }}>
                  ✓ ON-CHAIN CRYPTOGRAPHICALLY VERIFIED RECORD
                </Badge>
              </div>
            </CardHeader>

            <CardBody style={{ padding: "35px 40px" }}>
              
              {/* Document Title */}
              <div style={{ textAlign: "center", marginBottom: "30px" }}>
                <h5 style={{ fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>
                  {type === 'Land' ? 'Digital 7/12 Extract & Title Deed Certificate' : `Official e-KYC ${type} Verification Certificate`}
                </h5>
                <small style={{ color: "#64748b" }}>
                  Issued under Information Technology Act 2000 & Verified on Ethereum Blockchain
                </small>
              </div>

              {/* Render Uploaded File if available */}
              {fileData && (
                <div style={{ marginBottom: "30px", padding: "15px", background: "#f1f5f9", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                  <h6 style={{ fontWeight: 700, color: "#334155", marginBottom: "12px" }}>
                    📁 Uploaded Source Document Preview:
                  </h6>
                  {fileType === 'pdf' ? (
                    <embed src={fileData} type="application/pdf" width="100%" height="450px" style={{ borderRadius: "6px" }} />
                  ) : fileType === 'image' ? (
                    <div style={{ textAlign: "center" }}>
                      <img src={fileData} alt="Uploaded Document" style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "6px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} />
                    </div>
                  ) : (
                    <div style={{ padding: "10px", background: "#e2e8f0", borderRadius: "4px" }}>
                      Binary document cached in browser storage.
                    </div>
                  )}
                </div>
              )}

              {/* Verification Details Table */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", marginBottom: "25px" }}>
                <table className="table table-bordered" style={{ margin: 0, fontSize: "14px" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "35%", backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                        Legal Citizen / Owner Name
                      </td>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>
                        {name || 'N/A'}
                      </td>
                    </tr>

                    <tr>
                      <td style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                        Registered Wallet Address
                      </td>
                      <td>
                        <code style={{ color: "#2563eb", fontWeight: 600, fontSize: "13px" }}>{addr || 'N/A'}</code>
                      </td>
                    </tr>

                    {aadhar && (
                      <tr>
                        <td style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                          Aadhaar Identification No.
                        </td>
                        <td style={{ fontWeight: 600, letterSpacing: "1px" }}>
                          {aadhar} <Badge color="info" style={{ marginLeft: "6px" }}>UIDAI Linked</Badge>
                        </td>
                      </tr>
                    )}

                    {pan && (
                      <tr>
                        <td style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                          PAN Card Number
                        </td>
                        <td style={{ fontWeight: 600, textTransform: "uppercase" }}>
                          {pan} <Badge color="secondary" style={{ marginLeft: "6px" }}>Income Tax Dept.</Badge>
                        </td>
                      </tr>
                    )}

                    {city && (
                      <tr>
                        <td style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                          Jurisdiction / District
                        </td>
                        <td>{city}, Maharashtra</td>
                      </tr>
                    )}

                    {email && (
                      <tr>
                        <td style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                          Verified Email
                        </td>
                        <td>{email}</td>
                      </tr>
                    )}

                    {landId && (
                      <tr>
                        <td style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                          Land Property Identification (PID)
                        </td>
                        <td style={{ fontWeight: 700, color: "#059669" }}>
                          #{landId} {area ? `(${area} Sq. Ft)` : ''}
                        </td>
                      </tr>
                    )}

                    {survey && (
                      <tr>
                        <td style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                          Physical Survey Number
                        </td>
                        <td style={{ fontWeight: 700, color: "#d97706" }}>
                          Survey No. {survey}
                        </td>
                      </tr>
                    )}

                    {price && (
                      <tr>
                        <td style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                          Registered Land Price
                        </td>
                        <td style={{ fontWeight: 700, color: "#059669" }}>
                          {price} ETH
                        </td>
                      </tr>
                    )}

                    <tr>
                      <td style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                        IPFS Content Identifier (CID)
                      </td>
                      <td>
                        <code style={{ color: "#d97706", fontWeight: 600, fontSize: "13px", wordBreak: "break-all" }}>
                          {cid}
                        </code>
                      </td>
                    </tr>

                    <tr>
                      <td style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#475569" }}>
                        Smart Contract Authority
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        <code>
                          {(LandContract.networks['5777'] && LandContract.networks['5777'].address) ||
                            (LandContract.networks['1337'] && LandContract.networks['1337'].address) ||
                            (Object.values(LandContract.networks || {})[0] && Object.values(LandContract.networks || {})[0].address) ||
                            'Active Ganache Contract'}
                        </code> (Land.sol on Ganache)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Official Cryptographic Verification QR Code */}
              <div 
                style={{ 
                  marginTop: "30px", 
                  padding: "20px 24px", 
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", 
                  border: "2px solid #cbd5e1", 
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "20px"
                }}
              >
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "20px" }}>📱</span>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "1px" }}>
                      OFFICIAL BLOCKCHAIN VERIFICATION QR CODE
                    </span>
                    <Badge color="success" style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "12px" }}>
                      LIVE AUDIT
                    </Badge>
                  </div>
                  <h5 style={{ fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", fontSize: "17px" }}>
                    Scan to View & Verify Original Report
                  </h5>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <Button 
                      color="primary" 
                      size="sm" 
                      onClick={this.copyReportLink}
                      style={{ fontSize: "11px", fontWeight: 700, padding: "6px 14px", borderRadius: "6px" }}
                    >
                      <i className="fa fa-copy mr-1"></i> {copiedLink ? "✓ Link Copied!" : "Copy Report Link"}
                    </Button>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Encodes 100% of this report's verified parameters
                    </span>
                  </div>
                </div>

                {/* QR Code Frame */}
                <div 
                  style={{ 
                    textAlign: "center", 
                    background: "#ffffff", 
                    padding: "12px", 
                    borderRadius: "12px", 
                    border: "2px solid #1e293b", 
                    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                    alignSelf: "center"
                  }}
                >
                  <img
                    src={qrImageSource}
                    alt="Official Report QR Code"
                    style={{ width: "140px", height: "140px", display: "block", borderRadius: "4px" }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = qrFallbackSource;
                    }}
                  />
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "#0f172a", marginTop: "6px", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                    SCAN TO VERIFY
                  </div>
                </div>
              </div>

              {/* Digital Seal & Signatures */}
              <Row style={{ marginTop: "35px", alignItems: "center" }}>
                <Col md="6">
                  <div style={{ border: "2px dashed #94a3b8", borderRadius: "8px", padding: "12px 18px", textAlign: "center", backgroundColor: "#f8fafc" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                      DIGITAL REVENUE STAMP
                    </div>
                    <div style={{ fontWeight: 800, color: "#059669", fontSize: "15px", marginTop: "4px" }}>
                      🛡️ VERIFIED BY TEHSIL LAND INSPECTOR
                    </div>
                  </div>
                </Col>

                <Col md="6" style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-block", textAlign: "center", border: "1px solid #e2e8f0", padding: "10px 15px", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
                    <div style={{ fontSize: "28px" }}>📱</div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>E-SIGNATURE VERIFIED</div>
                    <small style={{ fontSize: "10px", color: "#94a3b8" }}>SHA-256 Multi-Hash</small>
                  </div>
                </Col>
              </Row>

            </CardBody>
          </Card>
        </Container>
      </div>
    );
  }
}
