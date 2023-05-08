import React from "react";
import "./index.css";
import { Table, Input } from "antd";
import { useEffect, useState } from "react";
import { Image } from "antd";
const { Search } = Input;
const columns = [
  {
    title: "Suplier",
    dataIndex: "suplierName",
    sorter: true,
    width: "20%",
    render: (text, record) => <a href={"#"}>{record.suplierName}</a>,
  },
  {
    title: "Image",
    dataIndex: "image",
    sorter: true,
    width: "15%",
    render: (text) => <Image src={text}></Image>,
  },
  {
    title: "SKU",
    dataIndex: "sku",
    width: "10%",
    render: (text, record) => <a href={record.link}>{text}</a>,
  },
  {
    title: "Stock",
    dataIndex: "stock",
    width: "10%",
  },
  {
    title: "1",
    dataIndex: ["prices", "0"],
  },
  {
    title: "10",
    dataIndex: ["prices", "1"],
  },
  {
    title: "100",
    dataIndex: ["prices", "2"],
  },
  {
    title: "1000",
    dataIndex: ["prices", "3"],
  },
  {
    title: "10000",
    dataIndex: ["prices", "4"],
  },
];

const App = () => {
  const [data, setData] = useState();
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const data = await fetch("http://localhost:8000").then((data) =>
      data.json()
    );
    console.log(data);
    setData(data);
    console.log(data);
  };

  useEffect(() => {
    fetchData();
  }, []);
  const onSearch = async (value) => {
    const data = await fetch(`http://localhost:8000?search=${value}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }).then(async (data) => await data.json());
    setData(data);
    console.log(value);
  };
  return (
    <>
      <Search
        placeholder="input manufacture part number"
        onSearch={onSearch}
        style={{
          width: 400,
          paddingBottom: 30,
        }}
      />
      <Table
        columns={columns}
        rowKey={(record) => {
          // eslint-disable-next-line no-unused-expressions
          record.suplierName;
        }}
        dataSource={data}
        // pagination={tableParams.pagination}
        // loading={loading}
        // onChange={handleTableChange}
      />
    </>
  );
};
export default App;
