import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 11,
          padding: "45px 34px",
          borderRadius: 40,
          color: "#080a08",
          background: "#d8ff4f",
        }}
      >
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            style={{
              width: 18,
              height: index === 2 ? 88 : 69,
              marginTop: index === 2 ? 19 : 0,
              borderRadius: 8,
              background: "#080a08",
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
