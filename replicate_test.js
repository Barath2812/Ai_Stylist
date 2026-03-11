import Replicate from "replicate";
import fs from "fs";
import path from "path";


const replicate = new Replicate({
  auth: "",
});

async function runTryOn() {
  try {
    console.log("Starting virtual try-on...");

    // Read local image files
    const humanImage = fs.readFileSync(path.resolve("./output.jpg"));
    const garmentImage = fs.readFileSync(path.resolve("./sample1.png"));

    const input = {
      human_img: humanImage,
      garm_img: garmentImage,
      garment_des: "casual black t-shirt",
      category: "upper_body",
    };

    const output = await replicate.run(
      "",
      { input }
    );

    console.log("Model finished.");

    // output will be a URL
    const imageUrl = output;

    console.log("Downloading result...");

    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    fs.writeFileSync("output.jpg", Buffer.from(buffer));

    console.log("Image saved as output.jpg in current folder");

  } catch (error) {
    console.error(" Error:", error);
  }
}

runTryOn();
