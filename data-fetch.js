//import fs from 'fs';
//import oracledb from 'oracledb';
const oracledb = require('oracledb');
const fs=require('fs');
//var oracledb = require( 'oracledb' );
//var fs=require('fs');
const sqlQuery1 = `
SELECT t.*,veh_start + (veh_end-veh_start)/2 AS BRK_START, veh_start + (veh_end-veh_start)/2+t.BRK_DURATION AS BRK_END FROM (
    SELECT s.segmentid, a.GRIDLONG VEH_START_LONG ,a.GRIDLAT VEH_START_LAT, b.GRIDLONG VEH_END_LONG,b.GRIDLAT VEH_END_LAT,
    START_TIME *60 VEH_START, end_time*60 VEH_END,
    CASE
    WHEN (end_time-start_time) > 659 THEN 90*60
    WHEN (end_time-start_time) BETWEEN 480 AND 659 THEN 60*60
    WHEN (end_time-start_time) BETWEEN 390 AND 479 THEN 30*60
    WHEN (end_time-start_time) < 389 THEN 0 END AS BRK_DURATION
    FROM itms_segment s, ITMS_ALIAS a, itms_alias b
    WHERE  s.travel_date = '26-OCT-2034' AND s.DISPOSITION ='T' AND s.ALIAS_START = a.ALIAS AND s.ALIAS_END = b.alias
   -- AND s.SEGMENTID IN ('S360035','S360060','S360068','S360069','S360081','S360100','S360101','S360102','S360103','S360115')
    ) t
`;
const sqlQuery2 = `
SELECT TRIPID,
NAME ||' '|| NAME2 ||'~'|| a.address1 || ' ' || a.address2 || ', ' ||  a.CITYTOWN || ', ' ||  a.STATEPRO AS PU_DESC, a.GRIDLONG AS PU_LONG, a.GRIDLAT AS PU_LAT,
NAME ||' '|| NAME2 ||'~'|| b.address1 || ' ' || b.address2 || ', ' ||  b.CITYTOWN || ', ' ||  b.STATEPRO AS DO_DESC, b.GRIDLONG AS DO_LONG, b.GRIDLAT AS DO_LAT,
substr(S_LOCATION3,1,instr(S_LOCATION3,'-')-1)*60 AS PU_START,
substr(S_LOCATION3,instr(S_LOCATION3,'-')+1)*60 AS PU_END,
(END_TIME-30)*60 AS DO_START,
(END_TIME)*60 AS DO_END
FROM ITMS_TRIPS t, ITMS_ALIAS a, itms_alias b
where travel_date = '26-OCT-2034' AND t.DISPOSITION ='T' AND t.ALIAS_S = a.ALIAS AND t.ALIAS_E = b.alias
AND trip_type <> 'BRK'
--AND res_num IN ('S360035','S360060','S360068','S360069','S360081','S360100','S360101','S360102','S360103','S360115')
`;

var vehicles = [];
async function getData_segments(){
	var connection = await oracledb.getConnection({
	  user: 'RTD',
	  password: 'RTD',
	  connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.85.140)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=RTD21PDB)))'
	});
	var result1 = await connection.execute(sqlQuery1);
	var rows1 = result1.rows;
	vehicles = [];

	rows1.forEach((row) => 
	{
		const brkStartIndex = result1.metaData.findIndex((m) => m.name === "BRK_START");
    const brkEndIndex = result1.metaData.findIndex((m) => m.name === "BRK_END");
		const brkStart = parseFloat(row[brkStartIndex]);
    const brkEnd = parseFloat(row[brkEndIndex]);
		vehicles.push({
		  id: Number(row[result1.metaData.findIndex( (m) => m.name === "SEGMENTID" )].replace('S', '')),
		  start: [row[result1.metaData.findIndex( (m) => m.name === "VEH_START_LONG" )], row[result1.metaData.findIndex( (m) => m.name === "VEH_START_LAT" )]],
		  end: [row[result1.metaData.findIndex( (m) => m.name === "VEH_END_LONG" )], row[result1.metaData.findIndex( (m) => m.name === "VEH_END_LAT" )]],
      capacity:[4],
		  time_window: [row[result1.metaData.findIndex( (m) => m.name === "VEH_START" )], row[result1.metaData.findIndex( (m) => m.name === "VEH_END" )]],
		  breaks: [{
	id:Number(row[result1.metaData.findIndex( (m) => m.name === "SEGMENTID" )].replace('S','')),			  
        max_load:[0],
	time_windows: [[brkStart, brkEnd]],
        duration: [brkEnd - brkStart]
	//time_windows: [[row[brkStartIndex], row[brkEndIndex]]],
        //duration: [row[brkEndIndex] - row[brkStartIndex]]
        //time_windows: [[row[result1.metaData.findIndex( (m) => m.name === "BRK_START" )], row[result1.metaData.findIndex( (m) => m.name === "BRK_END" )]]],
	//duration:Number([row[result1.metaData.findIndex( (m) => m.name === "BRK_END" )]])-Number([row[result1.metaData.findIndex( (m) => m.name === "BRK_START" )]])
      }]
		});
	});
console.log(JSON.stringify(vehicles));
}
var shipments = [];
async function getData_shipments(){
	var connection = await oracledb.getConnection({
	  user: 'RTD',
	  password: 'RTD',
	  connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.85.140)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=RTD21PDB)))'
	});
	var result2 = await connection.execute(sqlQuery2);
	var rows2 = result2.rows;
	shipments = [];

	rows2.forEach((row) => 
	{

		shipments.push({
      amount: [1],
		  pickup: {
        id: Number(row[result2.metaData.findIndex( (m) => m.name === "TRIPID" )].replace('T', '')),
        service: 300,
        description: row[result2.metaData.findIndex( (m) => m.name === "PU_DESC" )],
        location: [row[result2.metaData.findIndex( (m) => m.name === "PU_LONG" )], row[result2.metaData.findIndex( (m) => m.name === "PU_LAT" )]],
        time_windows: [[row[result2.metaData.findIndex( (m) => m.name === "PU_START" )], row[result2.metaData.findIndex( (m) => m.name === "PU_END" )]]]
      },
      delivery: {
        id: Number(row[result2.metaData.findIndex( (m) => m.name === "TRIPID" )].replace('T','')),
        service: 300,
        description: row[result2.metaData.findIndex( (m) => m.name === "DO_DESC" )],
        location: [row[result2.metaData.findIndex( (m) => m.name === "DO_LONG" )], row[result2.metaData.findIndex( (m) => m.name === "DO_LAT" )]],
        time_windows: [[row[result2.metaData.findIndex( (m) => m.name === "DO_START" )], row[result2.metaData.findIndex( (m) => m.name === "DO_END" )]]]
      }
		});
	});

console.log(JSON.stringify(shipments));
}
const options = {
  g: true
};

async function main(){
	await getData_segments();
  await getData_shipments();
  const jsonData = {
   vehicles: vehicles,
    shipments: shipments,
    options: options
  };
  
  // Write the input.json object to a file
  fs.writeFileSync('./input-auto.json', JSON.stringify(jsonData, null, 2));
}

main();
