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

class updateSeller extends Component {
    constructor(props){
        super(props)

        this.state = {
            LandInstance: undefined,
            account: null,
            web3: null,
            buyers: 0,
            sellers: 0,
            address: '',
            name: '',
            age: '',
            aadharNumber: '',
            panNumber: '',
            landsOwned: '',
            isVerified: false,
            verified: '',
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
                address: currentAddress,
                verified: seller_verify,
                name: seller[0], 
                age: seller[1], 
                aadharNumber: seller[2], 
                panNumber: seller[3], 
                landsOwned: seller[4]
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
              sellerTable.push(
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
              );  

        }catch (error) {
            // Catch any errors for any of the above operations.
            alert(
              `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
          }
    };

    updateSeller = async () => {
        if (this.state.name == '' || this.state.age == '' || this.state.aadharNumber == '' || this.state.panNumber == '' || this.state.landsOwned == '') {
            alert("All the fields are compulsory!");
        } else if (this.state.aadharNumber.length != 12) {
            alert("Aadhar Number should be 12 digits long!");
        } else if (this.state.panNumber.length != 10) {
            alert("Pan Number should be a 10 digit unique number!");
        } else if (!Number(this.state.age)) {
            alert("Your age must be a number");
        } else {
            await this.state.LandInstance.methods.updateSeller(
                this.state.name,
                this.state.age,
                this.state.aadharNumber,
                this.state.panNumber,
                this.state.landsOwned, 
                )
                .send({
                    from: this.state.address,
                    gas: 2100000
                }).then(response => {
                    this.props.history.push("/Seller/sellerProfile");
                });

            //Reload
            window.location.reload(false);
        }
    }

    updateName = event => (
        this.setState({ name: event.target.value })
    )
    updateAge = event => (
        this.setState({ age: event.target.value })
    )
    updateAadhar = event => (
        this.setState({ aadharNumber: event.target.value })
    )
    updatePan = event => (
        this.setState({ panNumber: event.target.value })
    )
    updateOwnedLands = event => (
        this.setState({ landsOwned: event.target.value })
    )

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
                                            <Row>
                                                <Col md="12">
                                                    <FormGroup>
                                                        <label>Name</label>
                                                        <Input
                                                            type="text"
                                                            value={this.state.name}
                                                            onChange={this.updateName}
                                                        />
                                                    </FormGroup>
                                                </Col>

                                            </Row>
                                            <Row>
                                                <Col md="12">
                                                    <FormGroup>
                                                        <label>Age</label>
                                                        <Input
                                                            type="text"
                                                            value={this.state.age}
                                                            onChange={this.updateAge}
                                                        />
                                                    </FormGroup>
                                                </Col>

                                            </Row>
                                            <Row>
                                                <Col md="12">
                                                    <FormGroup>
                                                        <label>Aadhar Number</label>
                                                        <Input
                                                            type="text"
                                                            value={this.state.aadharNumber}
                                                            onChange={this.updateAadhar}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                            </Row>
                                            <Row>
                                                <Col md="12">
                                                    <FormGroup>
                                                        <label>Pan Number</label>
                                                        <Input
                                                            type="text"
                                                            value={this.state.panNumber}
                                                            onChange={this.updatePan}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                            </Row>
                                            <Row>
                                                <Col md="12">
                                                    <FormGroup>
                                                        <label>Owned Lands</label>
                                                        <Input
                                                            type="text"
                                                            value={this.state.landsOwned}
                                                            onChange={this.updateOwnedLands}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                            </Row>
                                        </Form>
                                    </CardBody>
                                    <CardFooter>
                                        <Button onClick={this.updateSeller} className="btn-fill" color="primary">
                                            Update
                                        </Button>
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

export default updateSeller;
