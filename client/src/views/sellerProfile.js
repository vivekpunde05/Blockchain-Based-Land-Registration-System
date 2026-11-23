import React, {Component} from 'react'
import Land from "../artifacts/Land.json"
import getWeb3 from "../getWeb3"

import '../index.css';
import '../../node_modules/bootstrap/dist/css/bootstrap.min.css';
import { DrizzleProvider } from 'drizzle-react';
import { Table, Spinner } from 'react-bootstrap';
import {
    Button,
    Card,
    CardHeader,
    CardBody,
    CardFooter,
    CardText,
    FormGroup,
    Form,
    Input,
    Row,
    Col,
  } from "reactstrap";

import {
    LoadingContainer,
    AccountData,
    ContractData,
    ContractForm
} from 'drizzle-react-components'

const drizzleOptions = {
    contracts: [Land]
}

// var buyers = 0;
// var sellers = 0;
var seller;
var sellerTable = [];
var verification = [];

class sellerProfile extends Component {
    constructor(props){
        super(props)

        this.state = {
            LandInstance: undefined,
            account: null,
            web3: null,
            buyers: 0,
            sellers: 0,
            verified: false,
        }
    }

    componentDidMount = async () => {
        //For refreshing page only once
        if(!window.location.hash){
            window.location = window.location + '#loaded';
            window.location.reload();
        }

        try{
            //Get network provider and web3 instance
            const web3 = await getWeb3();

            const accounts = await web3.eth.getAccounts();

            const currentAddress = (await web3.currentProvider.selectedAddress) || accounts[0];
            console.log(currentAddress);
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

            var seller_verify = false;
            var not_verify = false;
            var seller = ["", "", "", "", "", ""];

            if (currentAddress) {
                seller_verify = await instance.methods.isVerified(currentAddress).call();
                not_verify = await instance.methods.isRejected(currentAddress).call();
                seller = await instance.methods.getSellerDetails(currentAddress).call();
            }

            this.setState({
                LandInstance: instance, 
                web3: web3, 
                account: currentAddress,
                verified: seller_verify
            });    

            if(seller_verify){
              verification.push(<p id = "verified">Verified <i class="fas fa-user-check"></i></p>);
            }else if(not_verify){
              verification.push(<p  id = "rejected">Rejected <i class="fas fa-user-times"></i></p>);
            }else{
              verification.push(<p id = "unknown">Not Yet Verified <i class="fas fa-user-cog"></i></p>);
            }

            console.log(seller);
            console.log(seller[0]);

            //sellerTable.push(<div><p>Name: {seller[0]}</p><p>Age: {seller[1]}</p><p>Aadhar Number: {seller[2]}</p><p>Pan Number: {seller[3]}</p><p>Owned Lands: {seller[4]}</p></div>);
              sellerTable.push(<>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <label>Your Wallet Address: </label>
                    <Input
                      disabled
                      type="text"
                      value={currentAddress}
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <label>Name</label>
                    <Input
                      disabled
                      type="text"
                      value={seller[0]}
                    />
                  </FormGroup>
                </Col>

              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <label>Age</label>
                    <Input
                      disabled
                      type="text"
                      value={seller[1]}
                    />
                  </FormGroup>
                </Col>
                
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <label>Aadhar Number</label>
                    <Input
                    disabled
                    type="text"
                    value={seller[2]}  
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <label>Pan Number</label>
                    <Input
                    disabled
                    type="text"
                    value={seller[3]}  
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <label>Owned Lands</label>
                    <Input
                    disabled
                    type="text"
                    value={seller[4]}  
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <label>Your Verified Aadhar Document</label>
                    <div className="post-meta">
                      <span className="timestamp">
                        <a 
                          href={`/view-document?cid=${seller[5]}&type=Seller&name=${encodeURIComponent(seller[0] || '')}&aadhar=${encodeURIComponent(seller[2] || '')}&pan=${encodeURIComponent(seller[3] || '')}&owned=${encodeURIComponent(seller[4] || '')}&addr=${this.state.account}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-info"
                          style={{ padding: "4px 12px", fontSize: "12px", borderRadius: "4px", fontWeight: "600" }}
                        >
                          📄 View Verified Document
                        </a>
                      </span>
                    </div>
                  </FormGroup>
                </Col>
              </Row></>);  

        }catch (error) {
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

        return (
            <div className="content">
            <DrizzleProvider options={drizzleOptions}>
            <LoadingContainer>
                
                {/* <div >
                    <h5>Seller Profile</h5>
                
                        {sellerTable}
        
                </div> */}
                        <Row>
                            <Col md="8">
                                <Card>
                                    <CardHeader>
                                        <h5 className="title">Seller Profile</h5>
                                        <h5 className="title">{verification}</h5>

                                    </CardHeader>
                                    <CardBody>
                                        <Form>
                                            {sellerTable}
                                            <Button href="/Seller/updateSeller"  className="btn-fill" disabled={!this.state.verified} color="primary">
                                            Edit Profile
                                      </Button>
                                        </Form>
                                    </CardBody>
                                    <CardFooter>
                                     
                                    </CardFooter>
                                </Card>
                            </Col>
                        </Row>
            </LoadingContainer>
            </DrizzleProvider>
            </div>
        );

    }    
}

export default sellerProfile;
