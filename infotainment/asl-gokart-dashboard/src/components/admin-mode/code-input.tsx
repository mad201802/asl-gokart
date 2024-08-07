import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
  } from "@/components/ui/input-otp"
import { useStore } from "@/stores/useStore";
import { REGEXP_ONLY_DIGITS } from "input-otp";


export const CodeInput = () => {

    const { adminPin, setAdminMode } = useStore();

    const PIN = "12345";

    return (
        <InputOTP 
        maxLength={5} 
        pattern={REGEXP_ONLY_DIGITS} 
        onComplete={(value) => value === PIN ? setAdminMode(true) : console.error("Wrong PIN!")}
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
