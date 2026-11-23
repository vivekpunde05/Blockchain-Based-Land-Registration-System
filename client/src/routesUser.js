import UserDashboard from "./views/UserDashboard";
import MyLands from "./views/MyLands";
import AddLand from "./views/AddLand";
import Marketplace from "./views/Marketplace";
import IncomingRequests from "./views/IncomingRequests";
import SentRequests from "./views/SentRequests";
import TransactionHistory from "./views/TransactionHistory";
import UserProfile from "./views/UserProfile";

var routes = [
  {
    path: "/dashboard",
    name: "User Dashboard",
    rtlName: "لوحة القيادة",
    icon: "tim-icons icon-chart-pie-36",
    component: UserDashboard,
    layout: "/User",
  },
  {
    path: "/Marketplace",
    name: "View All Properties",
    rtlName: "الرموز",
    icon: "tim-icons icon-world",
    component: Marketplace,
    layout: "/User",
  },
  {
    path: "/AddLand",
    name: "Register Property",
    rtlName: "الرموز",
    icon: "tim-icons icon-simple-add",
    component: AddLand,
    layout: "/User",
  },
  {
    path: "/MyLands",
    name: "Sell Property (My Lands)",
    rtlName: "الرموز",
    icon: "tim-icons icon-bank",
    component: MyLands,
    layout: "/User",
  },
  {
    path: "/IncomingRequests",
    name: "Incoming Offers",
    rtlName: "الرموز",
    icon: "tim-icons icon-bell-55",
    component: IncomingRequests,
    layout: "/User",
  },
  {
    path: "/SentRequests",
    name: "Buy Property (My Offers)",
    rtlName: "الرموز",
    icon: "tim-icons icon-money-coins",
    component: SentRequests,
    layout: "/User",
  },
  {
    path: "/Transactions",
    name: "Verify Ownership & History",
    rtlName: "الرموز",
    icon: "tim-icons icon-bullet-list-67",
    component: TransactionHistory,
    layout: "/User",
  },
  {
    path: "/Profile",
    name: "User Profile",
    rtlName: "الرموز",
    icon: "tim-icons icon-single-02",
    component: UserProfile,
    layout: "/User",
  },
];

export default routes;
