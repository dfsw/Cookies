# HTML Table Test for Icon Sizing

## Test 1: Markdown Table (Current Approach)
| Icon | Name | Description |
| :---: | --- | --- |
| <div style="width:48px;height:48px;overflow:hidden;display:inline-block;"><img src="assets/generated-icons/SheetVanilla1306.png" alt="Test1" width="48"></div> | **Short Name** | Short description |
| <div style="width:48px;height:48px;overflow:hidden;display:inline-block;"><img src="assets/generated-icons/SheetVanilla1406.png" alt="Test2" width="48"></div> | **Another Short** | Another short one |

## Test 2: Raw HTML Table with Fixed Column Width
<table>
  <thead>
    <tr>
      <th style="width:48px;min-width:48px;max-width:48px">Icon</th>
      <th>Name</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="width:48px;min-width:48px;max-width:48px"><img src="assets/generated-icons/SheetVanilla1306.png" alt="Test1" width="48" height="48"></td>
      <td><strong>Short Name</strong></td>
      <td>Short description</td>
    </tr>
    <tr>
      <td style="width:48px;min-width:48px;max-width:48px"><img src="assets/generated-icons/SheetVanilla1406.png" alt="Test2" width="48" height="48"></td>
      <td><strong>Another Short</strong></td>
      <td>Another short one</td>
    </tr>
  </tbody>
</table>

## Test 3: Raw HTML Table with Width Attribute on TD
<table>
  <thead>
    <tr>
      <th width="48">Icon</th>
      <th>Name</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td width="48"><img src="assets/generated-icons/SheetVanilla1306.png" alt="Test1" width="48" height="48"></td>
      <td><strong>Short Name</strong></td>
      <td>Short description</td>
    </tr>
    <tr>
      <td width="48"><img src="assets/generated-icons/SheetVanilla1406.png" alt="Test2" width="48" height="48"></td>
      <td><strong>Another Short</strong></td>
      <td>Another short one</td>
    </tr>
  </tbody>
</table>

## Test 4: Raw HTML Table with COL Element
<table>
  <colgroup>
    <col style="width:48px">
    <col>
    <col>
  </colgroup>
  <thead>
    <tr>
      <th>Icon</th>
      <th>Name</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="assets/generated-icons/SheetVanilla1306.png" alt="Test1" width="48" height="48"></td>
      <td><strong>Short Name</strong></td>
      <td>Short description</td>
    </tr>
    <tr>
      <td><img src="assets/generated-icons/SheetVanilla1406.png" alt="Test2" width="48" height="48"></td>
      <td><strong>Another Short</strong></td>
      <td>Another short one</td>
    </tr>
  </tbody>
</table>

