import LIDashboard from "./views/LIDashboard";
import UserInfo from "./views/UserInfo";
import LandApprovals from "./views/LandApprovals";
import TransactionInfo from "./views/TransactionInfo";

var routes = [
  {
    path: "/LIDashboard",
    name: "Dashboard",
    rtlName: "لوحة القيادة",
    icon: "tim-icons icon-chart-pie-36",
    component: LIDashboard,
    layout: "/LI",
  },
  {
    path: "/UserInfo",
    name: "User Management",
    rtlName: "لوحة القيادة",
    icon: "tim-icons icon-single-02",
    component: UserInfo,
    layout: "/LI",
  },
  {
    path: "/LandApprovals",
    name: "Land Records & Approvals",
    rtlName: "لوحة القيادة",
    icon: "tim-icons icon-badge",
    component: LandApprovals,
    layout: "/LI",
  },
  {
    path: "/TransactionInfo",
    name: "All Transactions",
    rtlName: "لوحة القيادة",
    icon: "tim-icons icon-paper",
    component: TransactionInfo,
    layout: "/LI",
  },
];

export default routes;
