import React, { useState } from "react";
import UrlShortenerForm from "../components/UrlShortenerForm";
import ShortUrlCard from "../components/ShortUrlCard";
import { Box } from "@mui/material";

const ShortenPage = () => {
  const [shortenedUrls, setShortenedUrls] = useState([]);

  const handleNewShortened = (data) => {
    setShortenedUrls([data, ...shortenedUrls]);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 5 }}>
      <UrlShortenerForm onShortened={handleNewShortened} />
      {shortenedUrls.map((url, index) => (
        <ShortUrlCard key={index} urlData={url} />
      ))}
    </Box>
  );
};

export default ShortenPage;
