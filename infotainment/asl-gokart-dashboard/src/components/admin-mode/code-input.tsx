import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
  } from "@/components/ui/input-otp"
import { useStore } from "@/stores/useStore";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { toast } from "sonner"


export const CodeInput = () => {

    const { adminPin, setAdminMode } = useStore();

    const PIN = "12345";

    let handleLogin = (pin: string) => {
        if(pin === PIN) {
            setAdminMode(true);
            toast("Admin mode enabled!");
        } else {
            console.error("Wrong PIN!");
            toast("Wrong PIN!");
        }
    }

    return (
        <InputOTP 
        maxLength={5} 
        pattern={REGEXP_ONLY_DIGITS} 
        onComplete={(value) => handleLogin(value)}
        value={adminPin}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
        </InputOTPGroup>
      </InputOTP>
    )
}
