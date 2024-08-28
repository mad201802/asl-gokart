import { Button } from "@/components/ui/button"
import { useStore } from "@/stores/useStore";
import { Delete } from "lucide-react";


export const CodeNumberpad = () => {

    const { adminPin, setAdminPin } = useStore();

    let handleAdminPinChange = (value: string, removingChar: boolean) => {
        if(removingChar) {
          if(adminPin.length > 0) {
            setAdminPin(value);
          } else {
            console.error("Admin Pin is already empty!");
          }
        } else {
          if(adminPin.length < 5) {
            setAdminPin(value);
          } else {
            console.error("Admin Pin is already 5 digits long!");
          }
        }
      }

    return ( 
        <div className="grid grid-cols-3 gap-2 mt-5">
        {Array.from(Array(9).keys()).map((i) => (
          <Button 
            key={i+1} 
            onClick={() => handleAdminPinChange(adminPin + (i+1).toString(), false)}
            disabled={adminPin.length >= 5}       
            >
            {i+1}
          </Button>
        ))}
        <Button 
          onClick={() => setAdminPin("")}
          disabled={adminPin.length === 0}>Clear</Button>
        <Button 
          onClick={() => handleAdminPinChange(adminPin + "0", false)}
          disabled={adminPin.length >= 5}>0</Button>
        <Button 
          onClick={() => handleAdminPinChange(adminPin.slice(0, -1), true)}
          disabled={adminPin.length === 0}>
          <Delete />
        </Button>
      </div>
    )
}