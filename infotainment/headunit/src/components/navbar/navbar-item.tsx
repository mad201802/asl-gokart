import { NavBarItemData } from "@/data/models";
import { Link } from "react-router-dom";

const NavBarItem = ({ Icon, label, linkTo }: NavBarItemData) => {
  return (
    <Link to={linkTo} className="flex flex-col items-center justify-center p-1 cursor-pointer">
      <Icon />
      <p>{label}</p>
    </Link>
  );
};

export default NavBarItem;
