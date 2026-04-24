import { CBadge } from "@coreui/react";

const Badge = ({ shape = "rounded", text, color = "success", size = "md" }) => {
  return (
    <>
      <CBadge color={color} shape={shape}>
        {text}
      </CBadge>
    </>
  );
};
export default Badge;
