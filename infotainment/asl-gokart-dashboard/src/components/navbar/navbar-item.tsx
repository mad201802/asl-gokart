import { NavBarItemData } from "@/data/models";

const NavBarItem = ({ Icon, label }: NavBarItemData) => {
  return (
    <div className="flex flex-col items-center justify-center p-1 cursor-pointer">
      <Icon />
      <p>{label}</p>
    </div>
  );
};

export default NavBarItem;
