import { NavBarItemData } from "@/data/models";
import NavBarItem from "./navbar-item";

interface NavBarProps {
  items: NavBarItemData[];
}

const NavBar = ({ items }: NavBarProps) => {
  return (
    <div className="h-full flex flex-col px-2 items-center justify-around">
      {items.map((item) => (
        <NavBarItem Icon={item.Icon} label={item.label} />
      ))}
    </div>
  );
};

export default NavBar;
