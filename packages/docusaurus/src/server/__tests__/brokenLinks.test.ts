/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {jest} from '@jest/globals';
import {handleBrokenLinks} from '../brokenLinks';
import type {RouteConfig} from '@docusaurus/types';

type Params = Parameters<typeof handleBrokenLinks>[0];

// We don't need all the routes attributes for our tests
type SimpleRoute = {path: string; routes?: SimpleRoute[]};

// Conveniently apply defaults to function under test
async function testBrokenLinks(params: {
  collectedLinks?: Params['collectedLinks'];
  onBrokenLinks?: Params['onBrokenLinks'];
  onBrokenAnchors?: Params['onBrokenAnchors'];
  routes?: SimpleRoute[];
}) {
  await handleBrokenLinks({
    collectedLinks: {},
    onBrokenLinks: 'throw',
    onBrokenAnchors: 'throw',
    ...params,
    // Unsafe but convenient for tests
    routes: (params.routes ?? []) as RouteConfig[],
  });
}

describe('handleBrokenLinks', () => {
  it('accepts valid link', async () => {
    await testBrokenLinks({
      routes: [{path: '/page1'}, {path: '/page2'}],
      collectedLinks: {
        '/page1': {links: ['/page2'], anchors: []},
        '/page2': {links: [], anchors: []},
      },
    });
  });

  it('accepts valid link to uncollected page', async () => {
    await testBrokenLinks({
      routes: [{path: '/page1'}, {path: '/page2'}],
      collectedLinks: {
        '/page1': {links: ['/page2'], anchors: []},
        // /page2 is absent on purpose: it doesn't contain any link/anchor
      },
    });
  });

  it('accepts valid link to nested route', async () => {
    await testBrokenLinks({
      routes: [
        {path: '/page1'},
        {path: '/nested/', routes: [{path: '/nested/page2'}]},
      ],
      collectedLinks: {
        '/page1': {links: ['/nested/page2'], anchors: []},
      },
    });
  });

  it('accepts valid relative link', async () => {
    await testBrokenLinks({
      routes: [{path: '/dir/page1'}, {path: '/dir/page2'}],
      collectedLinks: {
        '/dir/page1': {
          links: ['./page2', '../dir/page2', '/dir/page2'],
          anchors: [],
        },
      },
    });
  });

  it('accepts valid link with anchor', async () => {
    await testBrokenLinks({
      routes: [{path: '/page1'}, {path: '/page2'}],
      collectedLinks: {
        '/page1': {links: ['/page2#page2anchor'], anchors: []},
        '/page2': {links: [], anchors: ['page2anchor']},
      },
    });
  });

  it('accepts valid link with querystring + anchor', async () => {
    await testBrokenLinks({
      routes: [{path: '/page1'}, {path: '/page2'}],
      collectedLinks: {
        '/page1': {
          links: ['/page2?age=42&theme=dark#page2anchor'],
          anchors: [],
        },
        '/page2': {links: [], anchors: ['page2anchor']},
      },
    });
  });

  it('accepts valid link to self', async () => {
    await testBrokenLinks({
      routes: [{path: '/page1'}],
      collectedLinks: {
        '/page1': {
          links: [
            '/page1',
            './page1',
            '',
            '/page1#anchor1',
            '#anchor1',
            '/page1?age=42#anchor1',
            '?age=42#anchor1',
          ],
          anchors: ['anchor1'],
        },
      },
    });
  });

  it('accepts valid link with spaces and encoding', async () => {
    await testBrokenLinks({
      routes: [{path: '/page 1'}, {path: '/page 2'}],
      collectedLinks: {
        '/page 1': {
          links: [
            '/page 1',
            '/page%201',
            '/page%201?age=42',
            '/page 2',
            '/page%202',
            '/page%202?age=42',
            '/page%202?age=42#page2anchor',
          ],
          anchors: [],
        },
        '/page 2': {links: [], anchors: ['page2anchor']},
      },
    });
  });

  it('rejects broken link', async () => {
    await expect(() =>
      testBrokenLinks({
        routes: [{path: '/page1'}, {path: '/page2'}],
        collectedLinks: {
          '/page1': {links: ['/brokenLink'], anchors: []},
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken links!

      Please check the pages of your site in the list below, and make sure you don't reference any path that does not exist.
      Note: it's possible to ignore broken links with the 'onBrokenLinks' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken links found:
      - Broken link on source page path = /page1:
         -> linking to /brokenLink
      "
    `);
  });

  it('rejects broken link with anchor', async () => {
    await expect(() =>
      testBrokenLinks({
        routes: [{path: '/page1'}, {path: '/page2'}],
        collectedLinks: {
          '/page1': {links: ['/brokenLink#anchor'], anchors: []},
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken links!

      Please check the pages of your site in the list below, and make sure you don't reference any path that does not exist.
      Note: it's possible to ignore broken links with the 'onBrokenLinks' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken links found:
      - Broken link on source page path = /page1:
         -> linking to /brokenLink#anchor
      "
    `);
  });

  it('rejects broken link with querystring + anchor', async () => {
    await expect(() =>
      testBrokenLinks({
        routes: [{path: '/page1'}, {path: '/page2'}],
        collectedLinks: {
          '/page1': {links: ['/brokenLink?age=42#anchor'], anchors: []},
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken links!

      Please check the pages of your site in the list below, and make sure you don't reference any path that does not exist.
      Note: it's possible to ignore broken links with the 'onBrokenLinks' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken links found:
      - Broken link on source page path = /page1:
         -> linking to /brokenLink?age=42#anchor
      "
    `);
  });

  it('rejects valid link with broken anchor', async () => {
    await expect(() =>
      testBrokenLinks({
        routes: [{path: '/page1'}, {path: '/page2'}],
        collectedLinks: {
          '/page1': {links: ['/page2#brokenAnchor'], anchors: []},
          '/page2': {links: [], anchors: []},
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken anchors!

      Please check the pages of your site in the list below, and make sure you don't reference any anchor that does not exist.
      Note: it's possible to ignore broken anchors with the 'onBrokenAnchors' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken anchors found:
      - Broken anchor on source page path = /page1:
         -> linking to /page2#brokenAnchor
      "
    `);
  });

  it('rejects valid link with empty broken anchor', async () => {
    await expect(() =>
      testBrokenLinks({
        routes: [{path: '/page1'}, {path: '/page2'}],
        collectedLinks: {
          '/page1': {links: ['/page2#'], anchors: []},
          '/page2': {links: [], anchors: []},
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken anchors!

      Please check the pages of your site in the list below, and make sure you don't reference any anchor that does not exist.
      Note: it's possible to ignore broken anchors with the 'onBrokenAnchors' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken anchors found:
      - Broken anchor on source page path = /page1:
         -> linking to /page2#
      "
    `);
  });

  it('rejects valid link with broken anchor + query-string', async () => {
    await expect(() =>
      testBrokenLinks({
        routes: [{path: '/page1'}, {path: '/page2'}],
        collectedLinks: {
          '/page1': {
            links: ['/page2?age=42&theme=dark#brokenAnchor'],
            anchors: [],
          },
          '/page2': {links: [], anchors: []},
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken anchors!

      Please check the pages of your site in the list below, and make sure you don't reference any anchor that does not exist.
      Note: it's possible to ignore broken anchors with the 'onBrokenAnchors' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken anchors found:
      - Broken anchor on source page path = /page1:
         -> linking to /page2?age=42&theme=dark#brokenAnchor
      "
    `);
  });

  it('rejects valid link with broken anchor to self', async () => {
    await expect(() =>
      testBrokenLinks({
        routes: [{path: '/page1'}],
        collectedLinks: {
          '/page1': {
            links: [
              '/page1',
              '',
              '#goodAnchor',
              '/page1#goodAnchor',
              '/page1?age=42#goodAnchor',
              '#badAnchor1',
              '/page1#badAnchor2',
              '/page1?age=42#badAnchor3',
            ],

            anchors: ['goodAnchor'],
          },
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken anchors!

      Please check the pages of your site in the list below, and make sure you don't reference any anchor that does not exist.
      Note: it's possible to ignore broken anchors with the 'onBrokenAnchors' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken anchors found:
      - Broken anchor on source page path = /page1:
         -> linking to #badAnchor1 (resolved as: /page1#badAnchor1)
         -> linking to /page1#badAnchor2
         -> linking to /page1?age=42#badAnchor3
      "
    `);
  });

  it('rejects valid link with broken anchor to uncollected page', async () => {
    await expect(() =>
      testBrokenLinks({
        routes: [{path: '/page1'}, {path: '/page2'}],
        collectedLinks: {
          '/page1': {links: ['/page2#brokenAnchor'], anchors: []},
          // /page2 is absent on purpose: it doesn't contain any link/anchor
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken anchors!

      Please check the pages of your site in the list below, and make sure you don't reference any anchor that does not exist.
      Note: it's possible to ignore broken anchors with the 'onBrokenAnchors' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken anchors found:
      - Broken anchor on source page path = /page1:
         -> linking to /page2#brokenAnchor
      "
    `);
  });

  it('rejects broken anchor with query-string to uncollected page', async () => {
    await expect(() =>
      testBrokenLinks({
        routes: [{path: '/page1'}, {path: '/page2'}],
        collectedLinks: {
          '/page1': {
            links: ['/page2?age=42&theme=dark#brokenAnchor'],
            anchors: [],
          },
          // /page2 is absent on purpose: it doesn't contain any link/anchor
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken anchors!

      Please check the pages of your site in the list below, and make sure you don't reference any anchor that does not exist.
      Note: it's possible to ignore broken anchors with the 'onBrokenAnchors' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken anchors found:
      - Broken anchor on source page path = /page1:
         -> linking to /page2?age=42&theme=dark#brokenAnchor
      "
    `);
  });

  it('can ignore broken links', async () => {
    await testBrokenLinks({
      onBrokenLinks: 'ignore',
      routes: [{path: '/page1'}],
      collectedLinks: {
        '/page1': {
          links: ['/page2'],
          anchors: [],
        },
      },
    });
  });

  it('can ignore broken anchors', async () => {
    await testBrokenLinks({
      onBrokenAnchors: 'ignore',
      routes: [{path: '/page1'}],
      collectedLinks: {
        '/page1': {
          links: ['/page1#brokenAnchor'],
          anchors: [],
        },
      },
    });
  });

  it('can ignore broken anchors but report broken link', async () => {
    await expect(() =>
      testBrokenLinks({
        onBrokenAnchors: 'ignore',
        routes: [{path: '/page1'}],
        collectedLinks: {
          '/page1': {
            links: ['/page1#brokenAnchor', '/page2'],
            anchors: [],
          },
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken links!

      Please check the pages of your site in the list below, and make sure you don't reference any path that does not exist.
      Note: it's possible to ignore broken links with the 'onBrokenLinks' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken links found:
      - Broken link on source page path = /page1:
         -> linking to /page2
      "
    `);
  });

  it('can ignore broken link but report broken anchors', async () => {
    await expect(() =>
      testBrokenLinks({
        onBrokenLinks: 'ignore',
        routes: [{path: '/page1'}],
        collectedLinks: {
          '/page1': {
            links: [
              '/page2',
              '/page1#brokenAnchor1',
              '/page1#brokenAnchor2',
              '#brokenAnchor3',
            ],

            anchors: [],
          },
        },
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken anchors!

      Please check the pages of your site in the list below, and make sure you don't reference any anchor that does not exist.
      Note: it's possible to ignore broken anchors with the 'onBrokenAnchors' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken anchors found:
      - Broken anchor on source page path = /page1:
         -> linking to /page1#brokenAnchor1
         -> linking to /page1#brokenAnchor2
         -> linking to #brokenAnchor3 (resolved as: /page1#brokenAnchor3)
      "
    `);
  });

  it('can warn for broken links', async () => {
    const warnMock = jest.spyOn(console, 'warn');

    await testBrokenLinks({
      onBrokenLinks: 'warn',
      routes: [{path: '/page1'}],
      collectedLinks: {
        '/page1': {
          links: ['/page2'],
          anchors: [],
        },
      },
    });

    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(warnMock.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "[WARNING] Docusaurus found broken links!

      Please check the pages of your site in the list below, and make sure you don't reference any path that does not exist.
      Note: it's possible to ignore broken links with the 'onBrokenLinks' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken links found:
      - Broken link on source page path = /page1:
         -> linking to /page2
      ",
        ],
      ]
    `);
    warnMock.mockRestore();
  });

  it('can warn for broken anchors', async () => {
    const warnMock = jest.spyOn(console, 'warn');

    await testBrokenLinks({
      onBrokenAnchors: 'warn',
      routes: [{path: '/page1'}],
      collectedLinks: {
        '/page1': {
          links: ['/page1#brokenAnchor'],
          anchors: [],
        },
      },
    });

    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(warnMock.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "[WARNING] Docusaurus found broken anchors!

      Please check the pages of your site in the list below, and make sure you don't reference any anchor that does not exist.
      Note: it's possible to ignore broken anchors with the 'onBrokenAnchors' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken anchors found:
      - Broken anchor on source page path = /page1:
         -> linking to /page1#brokenAnchor
      ",
        ],
      ]
    `);
    warnMock.mockRestore();
  });

  it('can warn for both broken links and anchors', async () => {
    const warnMock = jest.spyOn(console, 'warn');

    await testBrokenLinks({
      onBrokenLinks: 'warn',
      onBrokenAnchors: 'warn',
      routes: [{path: '/page1'}],
      collectedLinks: {
        '/page1': {
          links: ['/page1#brokenAnchor', '/page2'],
          anchors: [],
        },
      },
    });

    expect(warnMock).toHaveBeenCalledTimes(2);
    expect(warnMock.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "[WARNING] Docusaurus found broken links!

      Please check the pages of your site in the list below, and make sure you don't reference any path that does not exist.
      Note: it's possible to ignore broken links with the 'onBrokenLinks' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken links found:
      - Broken link on source page path = /page1:
         -> linking to /page2
      ",
        ],
        [
          "[WARNING] Docusaurus found broken anchors!

      Please check the pages of your site in the list below, and make sure you don't reference any anchor that does not exist.
      Note: it's possible to ignore broken anchors with the 'onBrokenAnchors' Docusaurus configuration, and let the build pass.

      Exhaustive list of all broken anchors found:
      - Broken anchor on source page path = /page1:
         -> linking to /page1#brokenAnchor
      ",
        ],
      ]
    `);
    warnMock.mockRestore();
  });

  it('reports frequent broken links differently', async () => {
    const pagePaths = [
      '/page1',
      '/page2',
      '/dir/page3',
      '/dir/page4',
      '/dir/page5',
    ];

    const routes: SimpleRoute[] = pagePaths.map((pagePath) => ({
      path: pagePath,
    }));

    const collectedLinks: Params['collectedLinks'] = Object.fromEntries(
      pagePaths.map((pagePath) => [
        pagePath,
        {
          links: ['/frequentBrokenLink', './relativeFrequentBrokenLink'],
          anchors: [],
        },
      ]),
    );

    await expect(() =>
      testBrokenLinks({
        routes,
        collectedLinks,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docusaurus found broken links!

      Please check the pages of your site in the list below, and make sure you don't reference any path that does not exist.
      Note: it's possible to ignore broken links with the 'onBrokenLinks' Docusaurus configuration, and let the build pass.

      It looks like some of the broken links we found appear in many pages of your site.
      Maybe those broken links appear on all pages through your site layout?
      We recommend that you check your theme configuration for such links (particularly, theme navbar and footer).
      Frequent broken links are linking to:
      - /frequentBrokenLink
      - ./relativeFrequentBrokenLink

      Exhaustive list of all broken links found:
      - Broken link on source page path = /page1:
         -> linking to /frequentBrokenLink
         -> linking to ./relativeFrequentBrokenLink (resolved as: /relativeFrequentBrokenLink)
      - Broken link on source page path = /page2:
         -> linking to /frequentBrokenLink
         -> linking to ./relativeFrequentBrokenLink (resolved as: /relativeFrequentBrokenLink)
      - Broken link on source page path = /dir/page3:
         -> linking to /frequentBrokenLink
         -> linking to ./relativeFrequentBrokenLink (resolved as: /dir/relativeFrequentBrokenLink)
      - Broken link on source page path = /dir/page4:
         -> linking to /frequentBrokenLink
         -> linking to ./relativeFrequentBrokenLink (resolved as: /dir/relativeFrequentBrokenLink)
      - Broken link on source page path = /dir/page5:
         -> linking to /frequentBrokenLink
         -> linking to ./relativeFrequentBrokenLink (resolved as: /dir/relativeFrequentBrokenLink)
      "
    `);
  });
});
