import axios from "axios";

const Log = async (
  stack,
  level,
  packageName,
  message
) => {
  try {
    await axios.post(
      "http://4.224.186.213/evaluation-service/logs",
      {
        stack,
        level,
        package: packageName,
        message
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_TOKEN}`
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
};

export default Log;
